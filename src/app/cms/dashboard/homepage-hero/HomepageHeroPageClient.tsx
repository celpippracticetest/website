"use client";

import { useEffect, useMemo, useState } from "react";
import Check from "@mui/icons-material/Check";
import Autorenew from "@mui/icons-material/Autorenew";
import CloudUpload from "@mui/icons-material/CloudUpload";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type HomepageHeroSchedule = {
  id: string;
  name: string;
  imageUrl: string;
  altText: string;
  startDate: string;
  endDate: string;
  priority: number;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const EMPTY_SCHEDULE = {
  name: "Homepage Hero Campaign",
  imageUrl: "/images/hero.png",
  altText: "Hero image of CELPIP preparation platform showing student success",
  startDate: "",
  endDate: "",
  priority: 100,
  isEnabled: true,
};

function getTodayInToronto() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function HomepageHeroPageClient() {
  const [schedules, setSchedules] = useState<HomepageHeroSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const todayInToronto = useMemo(() => getTodayInToronto(), []);

  const selectedSchedule = useMemo(
    () => schedules.find((item) => item.id === selectedScheduleId) || null,
    [schedules, selectedScheduleId]
  );

  const isSelectedScheduleActive = useMemo(() => {
    return Boolean(
      form.isEnabled &&
        form.startDate &&
        form.endDate &&
        form.startDate <= todayInToronto &&
        form.endDate >= todayInToronto
    );
  }, [form.endDate, form.isEnabled, form.startDate, todayInToronto]);

  useEffect(() => {
    if (selectedSchedule) {
      setForm({
        name: selectedSchedule.name,
        imageUrl: selectedSchedule.imageUrl,
        altText: selectedSchedule.altText,
        startDate: selectedSchedule.startDate,
        endDate: selectedSchedule.endDate,
        priority: selectedSchedule.priority,
        isEnabled: selectedSchedule.isEnabled,
      });
    }
  }, [selectedSchedule]);

  const loadSchedules = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/homepage-hero", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload?.error || "Could not load homepage hero schedules.");
        return;
      }

      const nextSchedules: HomepageHeroSchedule[] = Array.isArray(payload?.data)
        ? payload.data
        : [];
      setSchedules(nextSchedules);

      if (nextSchedules.length === 0) {
        setSelectedScheduleId("");
        setForm({
          ...EMPTY_SCHEDULE,
          startDate: todayInToronto,
          endDate: todayInToronto,
        });
        return;
      }

      setSelectedScheduleId((current) => {
        const stillExists = nextSchedules.some((item) => item.id === current);
        return stillExists ? current : nextSchedules[0].id;
      });
    } catch (error) {
      console.error("[homepage-hero-admin] loadSchedules failed:", error);
      setMessage("Could not load homepage hero schedules.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const createSchedule = async () => {
    setMessage(null);
    setImageUploadError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...EMPTY_SCHEDULE,
          name: `Homepage Hero ${schedules.length + 1}`,
          startDate: todayInToronto,
          endDate: todayInToronto,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not create schedule.");
        return;
      }

      await loadSchedules();
      if (payload?.data?.id) {
        setSelectedScheduleId(payload.data.id);
      }
      setMessage("Homepage hero schedule created.");
    } catch (error) {
      console.error("[homepage-hero-admin] createSchedule failed:", error);
      setMessage("Could not create schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSchedule = async () => {
    if (!selectedScheduleId) {
      setMessage("Create a schedule first.");
      return;
    }

    setMessage(null);
    setImageUploadError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedScheduleId,
          ...form,
          priority: Number(form.priority || 0),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not save schedule.");
        return;
      }

      await loadSchedules();
      setMessage("Homepage hero schedule saved.");
    } catch (error) {
      console.error("[homepage-hero-admin] saveSchedule failed:", error);
      setMessage("Could not save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!selectedScheduleId) {
      return;
    }

    if (!window.confirm("Delete this homepage hero schedule?")) {
      return;
    }

    setMessage(null);
    setImageUploadError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/admin/homepage-hero?id=${encodeURIComponent(selectedScheduleId)}`,
        { method: "DELETE" }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || "Could not delete schedule.");
        return;
      }

      await loadSchedules();
      setMessage("Homepage hero schedule deleted.");
    } catch (error) {
      console.error("[homepage-hero-admin] deleteSchedule failed:", error);
      setMessage("Could not delete schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setImageUploadError(null);
    setMessage(null);
    setIsImageUploading(true);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch("/api/blog/upload-image", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message ?? "Image upload failed.");
      }

      const result = await response.json();
      const uploadedUrl: string = result.url;

      setForm((prev) => ({
        ...prev,
        imageUrl: uploadedUrl,
      }));
    } catch (error) {
      setImageUploadError(
        error instanceof Error ? error.message : "Could not upload image."
      );
    } finally {
      setIsImageUploading(false);
    }
  };

  return (
    <Box className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <Box className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Homepage Hero Scheduler</h1>
        <p className="text-sm text-slate-600">
          Set a hero image for a date range. The first enabled schedule that matches the current Toronto day will be shown on the homepage.
        </p>
      </Box>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Box className="flex flex-col gap-1">
            <CardTitle className="text-xl">Schedules</CardTitle>
            <CardDescription>
              Today in Toronto: {todayInToronto}
            </CardDescription>
          </Box>
          <Box className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedScheduleId}
              onChange={(event) => setSelectedScheduleId(event.target.value)}
              className="h-10 min-w-[240px] rounded-md border border-input bg-background px-3 text-[14px]"
              disabled={isLoading || schedules.length === 0}
            >
              {schedules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              {schedules.length === 0 ? (
                <option value="">No schedules yet</option>
              ) : null}
            </select>
            <Button type="button" variant="outline" onClick={createSchedule} disabled={isSaving}>
              New Schedule
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={deleteSchedule}
              disabled={!selectedScheduleId || isSaving}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </Box>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Box className="flex flex-col gap-4">
            <Box className="flex items-center gap-3">
              <Switch
                id="hero-schedule-enabled"
                checked={form.isEnabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isEnabled: checked }))
                }
              />
              <Label htmlFor="hero-schedule-enabled">Schedule enabled</Label>
              {isSelectedScheduleActive ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Active today
                </span>
              ) : null}
            </Box>

            <Box className="flex flex-col gap-2">
              <Label htmlFor="hero-schedule-name">Schedule name</Label>
              <Input
                id="hero-schedule-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ramadan homepage hero"
              />
            </Box>

            <Box className="flex flex-col gap-2">
              <Label htmlFor="hero-schedule-image">Upload image</Label>
              <Box className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <label
                  htmlFor="homepage-hero-image-upload"
                  className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {isImageUploading ? (
                    <Autorenew className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  <span>
                    {isImageUploading ? "Uploading..." : "Upload Hero Image"}
                  </span>
                </label>
                <Input
                  id="homepage-hero-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isImageUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleImageUpload(file);
                    }
                    event.target.value = "";
                  }}
                />
                {form.imageUrl ? (
                  <Box className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Image URL ready</span>
                  </Box>
                ) : null}
                {imageUploadError ? (
                  <p className="text-sm text-red-600">{imageUploadError}</p>
                ) : null}
                <p className="text-xs text-slate-500">
                  Uses the same storage uploader as blog featured images.
                </p>
              </Box>
            </Box>

            <Box className="flex flex-col gap-2">
              <Label htmlFor="hero-schedule-image">Image path or URL</Label>
              <Input
                id="hero-schedule-image"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                placeholder="/lovable-uploads/hero-ramadan.png"
              />
              <p className="text-xs text-slate-500">
                You can upload above, or paste a public URL manually.
              </p>
            </Box>

            <Box className="flex flex-col gap-2">
              <Label htmlFor="hero-schedule-alt">Image alt text</Label>
              <Input
                id="hero-schedule-alt"
                value={form.altText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, altText: event.target.value }))
                }
                placeholder="CELPIP student celebrating after reaching target score"
              />
            </Box>

            <Box className="flex flex-col gap-4 md:flex-row">
              <Box className="flex w-full flex-col gap-2">
                <Label htmlFor="hero-schedule-start">Start date</Label>
                <Input
                  id="hero-schedule-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </Box>

              <Box className="flex w-full flex-col gap-2">
                <Label htmlFor="hero-schedule-end">End date</Label>
                <Input
                  id="hero-schedule-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </Box>

              <Box className="flex w-full flex-col gap-2 md:max-w-[180px]">
                <Label htmlFor="hero-schedule-priority">Priority</Label>
                <Input
                  id="hero-schedule-priority"
                  type="number"
                  min={0}
                  value={form.priority}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: Number(event.target.value || 0),
                    }))
                  }
                />
                <p className="text-xs text-slate-500">Lower number wins if ranges overlap.</p>
              </Box>
            </Box>
          </Box>

          <Box className="flex flex-col gap-3">
            <Label>Preview</Label>
            <Box className="overflow-hidden rounded-xl border bg-slate-50 p-4">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.altText || "Homepage hero preview"}
                  className="max-h-[420px] w-full rounded-lg object-contain"
                />
              ) : (
                <Box className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
                  Add an image path or URL to preview it here.
                </Box>
              )}
            </Box>
          </Box>

          <Box className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={saveSchedule}
              disabled={isSaving || isLoading || isImageUploading || !selectedScheduleId}
            >
              {isSaving ? "Saving..." : "Save Schedule"}
            </Button>
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
