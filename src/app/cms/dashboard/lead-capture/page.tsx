"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Trigger = { enabled: boolean; value: number };
type LeadCaptureConfig = {
  id: string;
  name: string;
  headline: string;
  subHeadline: string;
  ctaText: string;
  exitIntent: Trigger;
  timeOnPage: Trigger;
  scrollDepth: Trigger;
  targetPaths: string[];
  senderGroupId?: string;
  senderGroupName?: string;
  priority: number;
  audience: {
    showToGuest: boolean;
    showToLoggedIn: boolean;
    showToPremium: boolean;
    showToWasPremium: boolean;
  };
  frequencyCapDays: number;
  isEnabled: boolean;
};

type SenderGroup = { id: string; name: string };

type LeadItem = {
  id: string;
  leadCaptureName?: string;
  firstName: string;
  email: string;
  subscribedAt: string;
  sourceUrl: string;
  triggerSource: string;
  senderGroupId?: string;
};

const DEFAULT_CONFIG: LeadCaptureConfig = {
  id: "",
  name: "New Lead Capture",
  headline: "Stuck at CLB 8? Get the Free 2026 CELPIP Templates Guide.",
  subHeadline:
    "Stop using robotic templates. Download our examiner-approved email and survey templates to hit CLB 9+.",
  ctaText: "Send My Free Guide",
  exitIntent: { enabled: true, value: 0 },
  timeOnPage: { enabled: true, value: 30 },
  scrollDepth: { enabled: true, value: 50 },
  targetPaths: [],
  senderGroupId: "",
  senderGroupName: "",
  priority: 100,
  audience: {
    showToGuest: true,
    showToLoggedIn: true,
    showToPremium: true,
    showToWasPremium: true,
  },
  frequencyCapDays: 30,
  isEnabled: true,
};

export default function LeadCaptureDashboardPage() {
  const [configs, setConfigs] = useState<LeadCaptureConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [config, setConfig] = useState<LeadCaptureConfig>(DEFAULT_CONFIG);
  const [senderGroups, setSenderGroups] = useState<SenderGroup[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const canGoPrev = page > 0;
  const canGoNext = useMemo(() => page + 1 < totalPages, [page, totalPages]);

  const selectedConfig = useMemo(
    () => configs.find((item) => item.id === selectedConfigId) || null,
    [configs, selectedConfigId]
  );

  useEffect(() => {
    if (selectedConfig) {
      setConfig(selectedConfig);
    }
  }, [selectedConfig]);

  const loadConfig = async () => {
    setIsConfigLoading(true);
    setConfigMessage(null);
    try {
      const response = await fetch("/api/admin/lead-capture/config", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setConfigMessage("Could not load popup configuration.");
        return;
      }

      const payload = await response.json();
      if (Array.isArray(payload?.data)) {
        setConfigs(payload.data);
        if (payload.data.length > 0) {
          const first = payload.data[0];
          setSelectedConfigId(first.id);
          setConfig(first);
        } else {
          setSelectedConfigId("");
          setConfig(DEFAULT_CONFIG);
        }
      }
    } catch (error) {
      console.error("[lead-capture-admin] loadConfig failed:", error);
      setConfigMessage("Could not load popup configuration.");
    } finally {
      setIsConfigLoading(false);
    }
  };

  const loadSenderGroups = async () => {
    try {
      const response = await fetch("/api/admin/lead-capture/sender-groups", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (Array.isArray(payload?.data)) {
        setSenderGroups(payload.data);
      }
    } catch (error) {
      console.error("[lead-capture-admin] loadSenderGroups failed:", error);
    }
  };

  const loadLeads = async () => {
    setIsLeadsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (selectedConfigId) {
        params.set("leadCaptureId", selectedConfigId);
      }

      const response = await fetch(`/api/admin/lead-capture/leads?${params}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      setLeads(payload?.items || []);
      setTotalItems(payload?.totalItems || 0);
      setTotalPages(payload?.totalPages || 0);
    } catch (error) {
      console.error("[lead-capture-admin] loadLeads failed:", error);
    } finally {
      setIsLeadsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadSenderGroups();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [page, search, selectedConfigId]);

  const updateTrigger = (
    key: "exitIntent" | "timeOnPage" | "scrollDepth",
    next: Partial<Trigger>
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...next,
      },
    }));
  };

  const saveConfig = async () => {
    if (!selectedConfigId) {
      setConfigMessage("Create a lead capture first.");
      return;
    }
    setIsSavingConfig(true);
    setConfigMessage(null);
    try {
      const response = await fetch("/api/admin/lead-capture/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, id: selectedConfigId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setConfigMessage(payload?.error || "Could not save configuration.");
        return;
      }

      setConfigMessage("Configuration saved successfully.");
      await loadConfig();
    } catch (error) {
      console.error("[lead-capture-admin] saveConfig failed:", error);
      setConfigMessage("Could not save configuration.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const createConfig = async () => {
    setConfigMessage(null);
    try {
      const response = await fetch("/api/admin/lead-capture/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...DEFAULT_CONFIG,
          name: `Lead Capture ${configs.length + 1}`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setConfigMessage(payload?.error || "Could not create lead capture.");
        return;
      }

      await loadConfig();
      if (payload?.data?.id) {
        setSelectedConfigId(payload.data.id);
      }
      setConfigMessage("Lead capture created.");
    } catch (error) {
      console.error("[lead-capture-admin] createConfig failed:", error);
      setConfigMessage("Could not create lead capture.");
    }
  };

  const deleteConfig = async () => {
    if (!selectedConfigId) return;
    if (!window.confirm("Delete this lead capture?")) return;
    setConfigMessage(null);
    try {
      const response = await fetch(
        `/api/admin/lead-capture/config?id=${encodeURIComponent(selectedConfigId)}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setConfigMessage(payload?.error || "Could not delete lead capture.");
        return;
      }
      await loadConfig();
      setConfigMessage("Lead capture deleted.");
    } catch (error) {
      console.error("[lead-capture-admin] deleteConfig failed:", error);
      setConfigMessage("Could not delete lead capture.");
    }
  };

  const exportCsv = () => {
    window.open("/api/admin/lead-capture/leads/export", "_blank");
  };

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Lead Capture</h1>
        <p className="text-sm text-gray-600">
          Manage popup copy, triggers, and collected leads.
        </p>
      </div>

      <Tabs defaultValue="popup-editor">
        <TabsList className="w-full max-w-[420px]">
          <TabsTrigger value="popup-editor">Pop-Up Editor</TabsTrigger>
          <TabsTrigger value="lead-database">Lead Database</TabsTrigger>
        </TabsList>

        <TabsContent value="popup-editor">
          <div className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Popup Campaign</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedConfigId}
                  onChange={(event) => setSelectedConfigId(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  {configs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                  {configs.length === 0 ? <option value="">No campaigns</option> : null}
                </select>
                <button
                  type="button"
                  onClick={createConfig}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={deleteConfig}
                  disabled={!selectedConfigId}
                  className="h-10 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, isEnabled: event.target.checked }))
                  }
                />
                Enabled
              </label>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <input
                type="number"
                min={0}
                value={config.priority}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    priority: Number(event.target.value || 0),
                  }))
                }
                className="h-10 w-[110px] rounded-lg border border-gray-300 px-3 text-sm"
              />
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Campaign Name</span>
              <input
                type="text"
                value={config.name}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, name: event.target.value }))
                }
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Headline Text</span>
              <input
                type="text"
                value={config.headline}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, headline: event.target.value }))
                }
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Sub-headline Text</span>
              <textarea
                value={config.subHeadline}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, subHeadline: event.target.value }))
                }
                className="min-h-[90px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">CTA Button Text</span>
              <input
                type="text"
                value={config.ctaText}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, ctaText: event.target.value }))
                }
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Target Paths (comma-separated, empty = all pages)
              </span>
              <input
                type="text"
                value={config.targetPaths.join(", ")}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    targetPaths: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Sender Group (subscribers list)
              </span>
              <select
                value={config.senderGroupId || ""}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const selected = senderGroups.find((item) => item.id === nextId);
                  setConfig((prev) => ({
                    ...prev,
                    senderGroupId: nextId,
                    senderGroupName: selected?.name || "",
                  }));
                }}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">No specific group</option>
                {senderGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                Audience Rules
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.audience.showToGuest}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        audience: {
                          ...prev.audience,
                          showToGuest: event.target.checked,
                        },
                      }))
                    }
                  />
                  Non-user (guest)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.audience.showToLoggedIn}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        audience: {
                          ...prev.audience,
                          showToLoggedIn: event.target.checked,
                        },
                      }))
                    }
                  />
                  Logged-in user
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.audience.showToPremium}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        audience: {
                          ...prev.audience,
                          showToPremium: event.target.checked,
                        },
                      }))
                    }
                  />
                  Premium user
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={config.audience.showToWasPremium}
                    onChange={(event) =>
                      setConfig((prev) => ({
                        ...prev,
                        audience: {
                          ...prev.audience,
                          showToWasPremium: event.target.checked,
                        },
                      }))
                    }
                  />
                  Was premium
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">Trigger Rules</div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.exitIntent.enabled}
                      onChange={(event) =>
                        updateTrigger("exitIntent", { enabled: event.target.checked })
                      }
                    />
                    Exit intent
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.timeOnPage.enabled}
                      onChange={(event) =>
                        updateTrigger("timeOnPage", { enabled: event.target.checked })
                      }
                    />
                    Time on page
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={config.timeOnPage.value}
                    onChange={(event) =>
                      updateTrigger("timeOnPage", { value: Number(event.target.value || 0) })
                    }
                    className="h-10 w-[110px] rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.scrollDepth.enabled}
                      onChange={(event) =>
                        updateTrigger("scrollDepth", { enabled: event.target.checked })
                      }
                    />
                    Scroll depth
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.scrollDepth.value}
                    onChange={(event) =>
                      updateTrigger("scrollDepth", { value: Number(event.target.value || 0) })
                    }
                    className="h-10 w-[110px] rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Frequency capping days
              </label>
              <input
                type="number"
                min={1}
                value={config.frequencyCapDays}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    frequencyCapDays: Number(event.target.value || 1),
                  }))
                }
                className="h-10 w-[110px] rounded-lg border border-gray-300 px-3 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveConfig}
                disabled={isSavingConfig || isConfigLoading}
                className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isSavingConfig ? "Saving..." : "Save Settings"}
              </button>
              {configMessage ? (
                <p className="text-sm text-gray-600">{configMessage}</p>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lead-database">
          <div className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-gray-900">Lead Database</h2>
                <p className="text-sm text-gray-600">{totalItems} total leads</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by name, email, source..."
                  value={search}
                  onChange={(event) => {
                    setPage(0);
                    setSearch(event.target.value);
                  }}
                  className="h-10 w-[280px] rounded-lg border border-gray-300 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={exportCsv}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700"
                >
                  Export to CSV
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Subscribed</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Source/Page URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLeadsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Loading leads...</TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No leads found.</TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.firstName}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>
                          {new Date(lead.subscribedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{lead.leadCaptureName || "-"}</TableCell>
                        <TableCell className="max-w-[360px] truncate">
                          {lead.sourceUrl}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canGoPrev}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm disabled:opacity-60"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
