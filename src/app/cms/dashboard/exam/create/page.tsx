"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Simple type for our payload. Adjust if your API expects different fields.
export type ExamLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "General";

interface ExamPayload {
  name: string;
  order?: number;
  createdAt?: string;
  isReady?: boolean;
}

type ExamListItem = {
  id: string | { $oid: string };
  name: string;
  order?: number;
  createdAt?: string | { $date: string };
  isReady?: boolean;
};

export default function ExamCreatePage() {
  const router = useRouter();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState<ExamPayload>({
    name: "Mock Set 1",
    order: 1,
    createdAt: "2025-05-01T23:22:33.000Z",
    isReady: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [publishNext, setPublishNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  async function fetchExams() {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/exams/dashboard?${params.toString()}`, {
        method: "GET",
      });
      if (!res.ok) {
        setExams([]);
        setTotal(0);
        return;
      }
      const raw = await res.json().catch(() => ({} as any));

      let list: ExamListItem[] = [];
      let totalCount = 0;
      if (Array.isArray(raw)) {
        list = raw as ExamListItem[];
        totalCount = list.length;
      } else if (Array.isArray(raw.items)) {
        list = raw.items as ExamListItem[];
        totalCount =
          Number(raw.total ?? raw.count ?? list.length) || list.length;
      } else if (Array.isArray(raw.data)) {
        list = raw.data as ExamListItem[];
        totalCount =
          Number(raw.total ?? raw.count ?? list.length) || list.length;
      } else if (Array.isArray(raw.results)) {
        list = raw.results as ExamListItem[];
        totalCount =
          Number(raw.total ?? raw.count ?? list.length) || list.length;
      } else if (raw.data && Array.isArray(raw.data.items)) {
        list = raw.data.items as ExamListItem[];
        totalCount =
          Number(raw.data.total ?? raw.total ?? list.length) || list.length;
      } else if (raw.results && Array.isArray(raw.results.items)) {
        list = raw.results.items as ExamListItem[];
        totalCount =
          Number(raw.results.total ?? raw.total ?? list.length) || list.length;
      }

      setExams(list);
      setTotal(totalCount);
    } catch (_) {
      setExams([]);
      setTotal(0);
    }
  }

  useEffect(() => {
    fetchExams();
  }, [page, limit, debouncedQ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  function oidToString(id: ExamListItem["id"]) {
    if (!id) return "";
    if (typeof id === "string") return id;
    if (typeof (id as any).$oid === "string") return (id as any).$oid;
    return String(id);
  }

  function dateToIso(d: ExamListItem["createdAt"]) {
    if (!d) return undefined;
    if (typeof d === "string") return d;
    if (typeof (d as any).$date === "string") return (d as any).$date;
    return undefined;
  }

  function loadExam(item: ExamListItem) {
    const id = oidToString(item.id);

    setSelectedId(id);
    setForm({
      name: item.name || "",
      order: item.order,
      createdAt: dateToIso(item.createdAt),
      isReady: !!item.isReady,
    });
    setPublishNext(!!item.isReady);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function resetToCreate() {
    setSelectedId(null);
    setForm({
      name: "",
      order: undefined,
      createdAt: undefined,
      isReady: false,
    });
    setPublishNext(false);
  }

  const canSubmit = useMemo(() => {
    const nameOk = form.name.trim().length >= 3;
    return nameOk && !submitting;
  }, [form.name, submitting]);

  function update<K extends keyof ExamPayload>(key: K, value: ExamPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: ExamPayload = {
        ...form,
        isReady: publishNext ? true : !!form.isReady,
      };

      const creating = !selectedId;
      const endpoint = "/api/exams";
      const method = creating ? "POST" : "PUT";
      const body = creating ? { ...payload } : { _id: selectedId, ...payload };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Request failed with status ${res.status}`
        );
      }

      const data = (await res.json().catch(() => ({}))) as {
        id?: string | number;
        examId?: string | number;
      };

      // Prefer `id` then `examId`; fallback to list page
      const createdId = (data?.id ?? data?.examId) as
        | string
        | number
        | undefined;

      await fetchExams();
      if (!selectedId && createdId) {
        setSelectedId(String(createdId));
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete exam function
  async function deleteExam(id: string) {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    setError(null);
    try {
      const res = await fetch("/api/exams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Failed to delete (status ${res.status})`
        );
      }
      await fetchExams();
      if (selectedId === id) {
        resetToCreate();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete exam");
    }
  }

  return (
    <div className="mx-auto w-full p-4 md:p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 border rounded-md p-3 max-h-[70vh] overflow-auto">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">All Exams ({total})</h2>
              <button
                type="button"
                onClick={resetToCreate}
                className="text-sm underline"
              >
                + New
              </button>
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by name…"
                className="w-full rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>
          </div>
          <ul className="divide-y">
            {exams.length === 0 && (
              <li className="py-3 text-sm text-gray-500">No exams yet.</li>
            )}
            {exams.map((ex, index) => {
              const id = oidToString(ex.id);
              const active = selectedId === id;
              return (
                <li key={index}>
                  <div>
                    <button
                      type="button"
                      onClick={() => loadExam(ex)}
                      className={`cursor-pointer w-full text-left py-2 px-2 rounded hover:bg-gray-50 ${
                        active ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{ex.name}</span>
                        <div className="flex items-center">
                          {ex.isReady ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border">
                              Published
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border">
                              Draft
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteExam(id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {typeof ex.order === "number" && (
                        <div className="text-xs text-gray-500">
                          Order: {ex.order}
                        </div>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span>Page {page + 1}</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded border px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </aside>
        <main className="lg:col-span-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-xl md:text-2xl font-semibold">
              {selectedId ? "Edit Exam" : "Create Exam"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPublishNext(false);
                  const formEl = document.getElementById(
                    "exam-form"
                  ) as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? selectedId
                    ? "Updating…"
                    : "Saving…"
                  : selectedId
                  ? "Update Draft"
                  : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublishNext(true);
                  const formEl = document.getElementById(
                    "exam-form"
                  ) as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-md bg-black text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? selectedId
                    ? "Updating…"
                    : "Publishing…"
                  : selectedId
                  ? "Update & Publish"
                  : "Save & Publish"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-2 text-xs text-gray-500">
            {selectedId ? (
              <span>Editing ID: {selectedId}</span>
            ) : (
              <span>Creating a new exam</span>
            )}
          </div>

          <form
            id="exam-form"
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., CELPIP – Listening Practice Test 1"
                className="block w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 3 characters.
              </p>
            </div>

            {/* Order */}
            <div>
              <label htmlFor="order" className="block text-sm font-medium mb-1">
                Display Order
              </label>
              <input
                id="order"
                type="number"
                value={
                  typeof form.order === "number"
                    ? form.order
                    : (form.order as any) || ""
                }
                onChange={(e) =>
                  update(
                    "order",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                placeholder="e.g., 1"
                className="block w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional. Lower numbers appear first.
              </p>
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-2">
              <input
                id="isReady"
                type="checkbox"
                checked={!!form.isReady}
                onChange={(e) => update("isReady", e.target.checked)}
                className="h-4 w-4 border rounded"
              />
              <label htmlFor="isReady" className="text-sm">
                Publish immediately
              </label>
            </div>

            {/* Actions (bottom too for mobile reachability) */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setPublishNext(false);
                  const formEl = document.getElementById(
                    "exam-form"
                  ) as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? selectedId
                    ? "Updating…"
                    : "Saving…"
                  : selectedId
                  ? "Update Draft"
                  : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublishNext(true);
                  const formEl = document.getElementById(
                    "exam-form"
                  ) as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-md bg-black text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? selectedId
                    ? "Updating…"
                    : "Publishing…"
                  : selectedId
                  ? "Update & Publish"
                  : "Save & Publish"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
