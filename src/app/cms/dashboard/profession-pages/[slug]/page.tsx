"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import Autorenew from "@mui/icons-material/Autorenew";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import ProfessionPageForm from "@/components/dashboard-app/cms/ProfessionPageForm";
import type { ProfessionPageFormSubmitPayload } from "@/components/dashboard-app/cms/ProfessionPageForm";
import type { TProfessionPageContent } from "@/models/profession-page.model";

export default function EditProfessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug);
  const router = useRouter();
  const [doc, setDoc] = useState<TProfessionPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/profession-pages/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setDoc(data);
      } catch {
        toast({
          title: "Error",
          description: "Could not load this profession page.",
          variant: "destructive",
        });
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [slug]);

  const onSubmit = async (data: ProfessionPageFormSubmitPayload) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/profession-pages/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to save.");
      }
      toast({ title: "Saved", description: slug });
      router.push("/cms/dashboard/profession-pages");
      router.refresh();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex h-screen items-center justify-center bg-slate-50">
        <Autorenew className="h-8 w-8 animate-spin text-slate-400" />
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <Button className="mt-4" asChild>
          <Link href="/cms/dashboard/profession-pages">Back to list</Link>
        </Button>
      </Box>
    );
  }

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/cms/dashboard/profession-pages">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Edit profession page</h1>
        <p className="mb-6 font-mono text-sm text-slate-600">{slug}</p>
        <ProfessionPageForm
          initialData={doc}
          slugReadOnly
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}
