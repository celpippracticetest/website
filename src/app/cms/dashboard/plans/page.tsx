"use client";

import React, { useEffect, useState } from "react";
import { Plan } from "@/models/plans.model";
import { formatPlanRecurringLabel, getPlanRecurringConfig } from "@/lib/planBilling";
import { Plus, Edit2, Trash2, X } from "lucide-react";

const PlansPage = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formData, setFormData] = useState<Partial<Plan>>({
        title: "",
        type: "",
        planTitle: "",
        oldPrice: "",
        price: "",
        discount: "",
        buttonTitle: "Go Premium",
        features: [],
        billingInterval: "month",
        billingIntervalCount: 1,
        isActive: true,
        order: 0,
        iconType: "PopularPlan",
        iconWrapperColor: "bg-purple5",
    });

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
            setFormData({
                title: "",
                type: "",
                planTitle: "",
                oldPrice: "",
                price: "",
                discount: "",
                buttonTitle: "Go Premium",
                features: [],
                billingInterval: "month",
                billingIntervalCount: 1,
                isActive: true,
                order: plans.length,
                iconType: "PopularPlan",
                iconWrapperColor: "bg-purple5",
            });
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
            [name]: value,
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
        setFormData((prev) => ({ ...prev, features: newFeatures }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingPlan ? "/api/admin/plans" : "/api/admin/plans";
            const method = editingPlan ? "PUT" : "POST";
            const body = editingPlan ? { ...formData, _id: editingPlan._id } : formData;

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

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Plans Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    Add New Plan
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan._id?.toString()}
                            className={`bg-white rounded-xl shadow-sm border p-6 relative ${!plan.isActive ? "opacity-60" : ""
                                }`}
                        >
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(plan)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan._id!.toString())}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                                    {plan.type}
                                </span>
                                <h3 className="text-xl font-bold text-gray-900">{plan.title}</h3>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        ${plan.price}
                                    </span>
                                    {plan.oldPrice && (
                                        <span className="text-sm text-gray-500 line-through">
                                            ${plan.oldPrice}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4 rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between gap-3">
                                    <span>Stripe</span>
                                    <span className={plan.stripePriceId ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                                        {plan.stripePriceId ? "Connected" : "Not connected"}
                                    </span>
                                </div>
                                <div>{formatPlanRecurringLabel(plan)}</div>
                                {plan.stripeProductId && (
                                    <div className="truncate">Product: {plan.stripeProductId}</div>
                                )}
                                {plan.stripePriceId && (
                                    <div className="truncate">Price: {plan.stripePriceId}</div>
                                )}
                            </div>

                            <div className="space-y-2 mb-4">
                                {plan.features.slice(0, 3).map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        {feature}
                                    </div>
                                ))}
                                {plan.features.length > 3 && (
                                    <div className="text-xs text-gray-400 pl-3.5">
                                        +{plan.features.length - 3} more features
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t flex justify-between items-center text-sm text-gray-500">
                                <span>Order: {plan.order}</span>
                                <span>{plan.isActive ? "Active" : "Inactive"}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
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

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        Button Title
                                    </label>
                                    <input
                                        type="text"
                                        name="buttonTitle"
                                        value={formData.buttonTitle}
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

                            <div className="flex justify-end gap-3 pt-4 border-t">
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
