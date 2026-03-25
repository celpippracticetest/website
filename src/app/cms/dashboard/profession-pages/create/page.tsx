"use client";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import ProfessionPageForm from "@/components/dashboard-app/cms/ProfessionPageForm";
import type { ProfessionPageFormSubmitPayload } from "@/components/dashboard-app/cms/ProfessionPageForm";
import { useState } from "react";

export default function CreateProfessionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ProfessionPageFormSubmitPayload) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/profession-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || "Failed to create page.");
      }
      toast({ title: "Created", description: data.slug });
      router.push("/cms/dashboard/profession-pages");
      router.refresh();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/cms/dashboard/profession-pages">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">New profession page</h1>
        <ProfessionPageForm
          initialData={null}
          slugReadOnly={false}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}
