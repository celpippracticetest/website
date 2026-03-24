"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plan } from "@/models/plans.model";
import { formatPlanRecurringLabel, getPlanRecurringConfig } from "@/lib/planBilling";
import {
    getAccessLabel,
    getPlanButtonLabel,
    getAccessTierKey,
    getDurationGroupKey,
    getStablePlanId,
} from "@/lib/pricing";
import {
    accessTierMeta,
    durationDisplayOrder,
    durationMeta,
    getPlanTemplateById,
    planTemplates,
} from "@/lib/pricingCatalog";
import type { SerializedPlan } from "@/types/pricing";
import { Plus, Edit2, Layers3, Trash2, X, BarChart2, RefreshCw } from "lucide-react";

type PlanFormData = Partial<Plan>;

function createEmptyPlanForm(order: number): PlanFormData {
    return {
        title: "",
        type: "",
        planTitle: "",
        oldPrice: "",
        price: "",
        discount: "",
        buttonTitle: "Get Premium",
        features: [""],
        billingInterval: "month",
        billingIntervalCount: 1,
        isActive: true,
        order,
        iconType: "PopularPlan",
        iconWrapperColor: "bg-purple5",
    };
}

function toSerializedPlan(plan: Partial<Plan>): SerializedPlan {
    return {
        _id: plan._id?.toString(),
        title: plan.title || "",
        type: plan.type || "",
        planTitle: plan.planTitle || "",
        oldPrice: plan.oldPrice || "",
        price: plan.price || "",
        discount: plan.discount || "",
        buttonTitle: plan.buttonTitle || "",
        features: plan.features || [],
        billingInterval: plan.billingInterval,
        billingIntervalCount: plan.billingIntervalCount,
        stripePriceId: plan.stripePriceId,
        iconType: plan.iconType,
        iconWrapperColor: plan.iconWrapperColor,
        order: plan.order,
    };
}

type PricingAbVariantRow = {
    layout: string;
    page_views: number;
    checkout_started: number;
    purchases: number;
    checkout_rate: number;
    purchase_rate: number;
    purchase_per_checkout: number;
};

const PlansPage = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formData, setFormData] = useState<PlanFormData>(createEmptyPlanForm(0));
    const [abStats, setAbStats] = useState<{
        days: number;
        since: string;
        variants: PricingAbVariantRow[];
    } | null>(null);
    const [abStatsLoading, setAbStatsLoading] = useState(false);
    const [abStatsDays, setAbStatsDays] = useState(30);
    const [abStatsRefreshTick, setAbStatsRefreshTick] = useState(0);

    const fetchPlans = async () => {
        try {
            const response = await fetch("/api/admin/plans");
            const data = await response.json();
            if (data.plans) {
                setPlans(data.plans);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        let cancelled = false;
        setAbStatsLoading(true);
        fetch(`/api/admin/pricing-ab-stats?days=${abStatsDays}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled && Array.isArray(data.variants)) {
                    setAbStats({
                        days: data.days,
                        since: data.since,
                        variants: data.variants,
                    });
                }
            })
            .catch((err) => console.error("pricing-ab-stats:", err))
            .finally(() => {
                if (!cancelled) setAbStatsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [abStatsDays, abStatsRefreshTick]);

    const handleOpenModal = (plan?: Plan) => {
        if (plan) {
            const recurring = getPlanRecurringConfig(plan);
            setEditingPlan(plan);
            setFormData({
                ...plan,
                billingInterval: recurring.interval,
                billingIntervalCount: recurring.interval_count,
            });
        } else {
            setEditingPlan(null);
            setFormData(createEmptyPlanForm(plans.length));
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPlan(null);
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name === "order" || name === "billingIntervalCount"
                    ? Number.parseInt(value || "0", 10)
                    : value,
        }));
    };

    const applyTemplate = (templateId: string) => {
        const template = getPlanTemplateById(templateId);
        if (!template) return;

        setFormData((prev) => ({
            ...prev,
            title: template.title,
            type: template.type,
            planTitle: template.planTitle,
            buttonTitle: template.buttonTitle,
            billingInterval: template.billingInterval,
            billingIntervalCount: template.billingIntervalCount,
            iconType: template.iconType,
            iconWrapperColor: template.iconWrapperColor,
        }));
    };

    const handleFeatureChange = (index: number, value: string) => {
        const newFeatures = [...(formData.features || [])];
        newFeatures[index] = value;
        setFormData((prev) => ({ ...prev, features: newFeatures }));
    };

    const addFeature = () => {
        setFormData((prev) => ({
            ...prev,
            features: [...(prev.features || []), ""],
        }));
    };

    const removeFeature = (index: number) => {
        const newFeatures = [...(formData.features || [])];
        newFeatures.splice(index, 1);
        setFormData((prev) => ({ ...prev, features: newFeatures.length > 0 ? newFeatures : [""] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingPlan ? "/api/admin/plans" : "/api/admin/plans";
            const method = editingPlan ? "PUT" : "POST";
            const normalizedFormData = {
                ...formData,
                buttonTitle: getPlanButtonLabel(toSerializedPlan(formData)),
            };
            const body = editingPlan
                ? { ...normalizedFormData, _id: editingPlan._id }
                : normalizedFormData;

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                handleCloseModal();
                fetchPlans();
            } else {
                console.error("Failed to save plan");
            }
        } catch (error) {
            console.error("Error saving plan:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;

        try {
            const response = await fetch(`/api/admin/plans?id=${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchPlans();
            } else {
                console.error("Failed to delete plan");
            }
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    const sortedPlans = useMemo(() => {
        return [...plans].sort((left, right) => left.order - right.order);
    }, [plans]);

    const planStats = useMemo(() => {
        const activeCount = plans.filter((plan) => plan.isActive).length;
        const premiumPlusCount = plans.filter((plan) =>
            getAccessTierKey(toSerializedPlan(plan)) === "premiumPlus"
        ).length;

        return {
            total: plans.length,
            active: activeCount,
            premiumPlus: premiumPlusCount,
        };
    }, [plans]);

    const groupedPlans = useMemo(() => {
        return durationDisplayOrder
            .map((durationKey) => ({
                key: durationKey,
                meta: durationMeta[durationKey],
                items: sortedPlans.filter((plan) => getDurationGroupKey(toSerializedPlan(plan)) === durationKey),
            }))
            .filter((section) => section.items.length > 0);
    }, [sortedPlans]);

    const formPreviewPlan = useMemo(() => toSerializedPlan(formData), [formData]);
    const selectedDurationKey = getDurationGroupKey(formPreviewPlan);
    const selectedAccessKey = getAccessTierKey(formPreviewPlan);
    const selectedAccessLabel = getAccessLabel(formPreviewPlan);
    const selectedButtonLabel = getPlanButtonLabel(formPreviewPlan);

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
                        Shared pricing system
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-800">Plans Management</h1>
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                        The CMS now follows the same duration and access structure used on the public pricing page.
                        Use a template first, then fill in pricing and features.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Add New Plan
                </button>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Total plans</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{planStats.total}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Active plans</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">{planStats.active}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Premium Plus plans</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">{planStats.premiumPlus}</p>
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <BarChart2 className="mt-0.5 h-6 w-6 text-indigo-600" />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
                                Public pricing page A/B
                            </p>
                            <h2 className="mt-1 text-lg font-bold text-gray-900">
                                Layout conversion (50/50 experiment)
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm text-gray-600">
                                Visitors to <code className="rounded bg-white/80 px-1">/pricing</code> see
                                either two side-by-side plan cards or a single card with a Premium /
                                Premium Plus toggle. Metrics: page views (per session), checkout starts,
                                and completed purchases attributed from Stripe. Preview URLs{" "}
                                <code className="rounded bg-white/80 px-1">?s=1</code> and{" "}
                                <code className="rounded bg-white/80 px-1">?s=2</code> force a layout for
                                that load only and are excluded from this report.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Range</span>
                            <select
                                value={abStatsDays}
                                onChange={(e) => setAbStatsDays(Number(e.target.value))}
                                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                            >
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={90}>90 days</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={() => setAbStatsRefreshTick((t) => t + 1)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            title="Reload stats"
                        >
                            <RefreshCw className={`h-4 w-4 ${abStatsLoading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>
                {abStatsLoading && !abStats ? (
                    <p className="mt-4 text-sm text-gray-500">Loading experiment stats…</p>
                ) : abStats ? (
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="py-2 pr-4">Layout</th>
                                    <th className="py-2 pr-4">Page views</th>
                                    <th className="py-2 pr-4">Checkouts started</th>
                                    <th className="py-2 pr-4">Purchases</th>
                                    <th className="py-2 pr-4">Checkout / view</th>
                                    <th className="py-2 pr-4">Purchase / view</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abStats.variants.map((row) => (
                                    <tr
                                        key={row.layout}
                                        className="border-b border-gray-100 last:border-0"
                                    >
                                        <td className="py-3 pr-4 font-medium text-gray-900">
                                            {row.layout === "two_card"
                                                ? "Two cards"
                                                : row.layout === "switch_toggle"
                                                  ? "Premium / Plus toggle"
                                                  : row.layout}
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums text-gray-800">
                                            {row.page_views}
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums text-gray-800">
                                            {row.checkout_started}
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums text-gray-800">
                                            {row.purchases}
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums text-gray-700">
                                            {(row.checkout_rate * 100).toFixed(1)}%
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums text-emerald-700">
                                            {(row.purchase_rate * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-3 text-xs text-gray-500">
                            Since {new Date(abStats.since).toLocaleDateString()} ({abStats.days}-day window).
                        </p>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-gray-500">No experiment data yet.</p>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedPlans.map((section) => (
                        <div key={section.key}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        {section.meta.eyebrow}
                                    </p>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {section.meta.title}
                                    </h2>
                                    <p className="text-sm text-gray-600">{section.meta.summary}</p>
                                </div>
                                <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-600">
                                    {section.items.length} plan{section.items.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {section.items.map((plan) => {
                                    const serializedPlan = toSerializedPlan(plan);
                                    const accessLabel = getAccessLabel(serializedPlan) || "Unclassified";
                                    const stableId = getStablePlanId(serializedPlan, plan.order);

                                    return (
                                        <div
                                            key={stableId}
                                            className={`relative rounded-2xl border bg-white p-6 shadow-sm ${!plan.isActive ? "opacity-60" : ""}`}
                                        >
                                            <div className="absolute right-4 top-4 flex gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(plan)}
                                                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(plan._id!.toString())}
                                                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            <div className="mb-4">
                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                                        {accessLabel}
                                                    </span>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                                        {plan.type}
                                                    </span>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                        plan.isActive
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-gray-100 text-gray-500"
                                                    }`}>
                                                        {plan.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-900">{plan.title}</h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {plan.planTitle} · {formatPlanRecurringLabel(plan)}
                                                </p>

                                                <div className="mt-3 flex items-baseline gap-2">
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        CA$ {plan.price}
                                                    </span>
                                                    {plan.oldPrice && (
                                                        <span className="text-sm text-gray-500 line-through">
                                                            CA$ {plan.oldPrice}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-4 rounded-xl border bg-gray-50 px-3 py-3 text-xs text-gray-600">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span>Stripe</span>
                                                    <span className={plan.stripePriceId ? "font-medium text-green-700" : "font-medium text-amber-700"}>
                                                        {plan.stripePriceId ? "Connected" : "Not connected"}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-3">
                                                    <span>Order</span>
                                                    <span>{plan.order}</span>
                                                </div>
                                            </div>

                                            <div className="mb-4 space-y-2">
                                                {plan.features.slice(0, 3).map((feature, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                                        {feature}
                                                    </div>
                                                ))}
                                                {plan.features.length > 3 && (
                                                    <div className="pl-3.5 text-xs text-gray-400">
                                                        +{plan.features.length - 3} more features
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border-t pt-4 text-xs text-gray-500">
                                                Public pricing groups this under{" "}
                                                <span className="font-semibold text-gray-700">
                                                    {durationMeta[section.key].title}
                                                </span>
                                                {" / "}
                                                <span className="font-semibold text-gray-700">{accessLabel}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingPlan ? "Edit Plan" : "Create New Plan"}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                            <div className="rounded-2xl border bg-slate-50 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Layers3 size={18} className="text-blue-700" />
                                    <h3 className="font-semibold text-gray-900">Quick templates</h3>
                                </div>
                                <p className="mb-4 text-sm text-gray-600">
                                    Apply a standard duration and access pattern so this plan matches the public pricing system.
                                </p>
                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                                    {planTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => applyTemplate(template.id)}
                                            className="rounded-xl border bg-white px-3 py-3 text-left text-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
                                        >
                                            <div className="font-semibold text-gray-900">{template.label}</div>
                                            <div className="mt-1 text-xs text-gray-500">{template.title}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Detected duration
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">
                                        {selectedDurationKey ? durationMeta[selectedDurationKey].title : "Not detected"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Detected access
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">
                                        {selectedAccessLabel || "Not detected"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                                        Public pricing summary
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-gray-900">
                                        {selectedDurationKey ? durationMeta[selectedDurationKey].summary : "Choose a billing interval or apply a template."}
                                    </p>
                                    {selectedAccessKey && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            {accessTierMeta[selectedAccessKey].summary}
                                        </p>
                                    )}
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                                        CTA: {selectedButtonLabel}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Type (Badge)
                                    </label>
                                    <input
                                        type="text"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Plan Title (Duration)
                                    </label>
                                    <input
                                        type="text"
                                        name="planTitle"
                                        value={formData.planTitle}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price
                                    </label>
                                    <input
                                        type="text"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Old Price
                                    </label>
                                    <input
                                        type="text"
                                        name="oldPrice"
                                        value={formData.oldPrice}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount %
                                    </label>
                                    <input
                                        type="text"
                                        name="discount"
                                        value={formData.discount}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Order
                                    </label>
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Billing Interval
                                    </label>
                                    <select
                                        name="billingInterval"
                                        value={formData.billingInterval || "month"}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="day">Daily</option>
                                        <option value="week">Weekly</option>
                                        <option value="month">Monthly</option>
                                        <option value="year">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Billing Interval Count
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        name="billingIntervalCount"
                                        value={formData.billingIntervalCount ?? 1}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Example: `3` with `month` means billed every 3 months.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Icon Type
                                    </label>
                                    <select
                                        name="iconType"
                                        value={formData.iconType}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="BestValuePlan">Best Value (Diamond)</option>
                                        <option value="PopularPlan">Popular (Crown)</option>
                                        <option value="FreePlan">Free (Star)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Icon Wrapper Color
                                    </label>
                                    <input
                                        type="text"
                                        name="iconWrapperColor"
                                        value={formData.iconWrapperColor}
                                        onChange={handleInputChange}
                                        placeholder="e.g., bg-purple5"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stripe Price ID
                                    </label>
                                    <input
                                        type="text"
                                        name="stripePriceId"
                                        value={formData.stripePriceId || ""}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Leave blank to auto-create in Stripe"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Leave this blank to auto-create and sync the Stripe product and price.
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stripe Product ID
                                    </label>
                                    <input
                                        type="text"
                                        name="stripeProductId"
                                        value={formData.stripeProductId || ""}
                                        onChange={handleInputChange}
                                        placeholder="Auto-generated when Stripe sync runs"
                                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        This is generated automatically when the plan is synced to Stripe.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Features
                                </label>
                                <div className="space-y-2">
                                    {formData.features?.map((feature, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Feature description"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFeature(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addFeature}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Add Feature
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Premium Plus plans should clearly mention mock exams or use a Premium Plus title so the public pricing page can classify them correctly.
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    Active (Visible to users)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingPlan ? "Save Changes" : "Create Plan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlansPage;
