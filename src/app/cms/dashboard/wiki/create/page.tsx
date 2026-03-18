"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ChevronLeft } from "lucide-react";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import WikiArticleForm from "@/components/dashboard-app/cms/WikiArticleForm";
import type { TWikiArticleWriteInput } from "@/models/wiki.model";

export default function CreateWikiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: TWikiArticleWriteInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create wiki article."
        );
      }

      toast({
        title: "Wiki article created",
        description: "The article has been saved and is live on /wiki.",
      });
      router.push("/cms/dashboard/wiki");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="mx-auto max-w-5xl p-4 md:p-6">
      <Box className="mb-6 flex items-center gap-4">
        <Link href="/cms/dashboard/wiki">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Box>
          <h1 className="text-2xl font-bold text-slate-900">
            Create Wiki Article
          </h1>
          <p className="text-sm text-slate-500">
            Add a new article to the CELPIP Wiki. Use HTML for content.
          </p>
        </Box>
      </Box>
      <WikiArticleForm isLoading={isLoading} onSubmit={onSubmit} />
    </Box>
  );
}
