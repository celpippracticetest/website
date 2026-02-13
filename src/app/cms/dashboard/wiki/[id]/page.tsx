"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import WikiArticleForm from "@/components/dashboard-app/cms/WikiArticleForm";
import type {
  TWikiArticleSchemaDto,
  TWikiArticleWriteInput,
} from "@/models/wiki.model";

export default function EditWikiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<TWikiArticleSchemaDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/wiki/${id}`);
        if (!response.ok) throw new Error("Failed to load wiki article.");
        const data = await response.json();
        setArticle(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load wiki article.";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  const onSubmit = async (values: TWikiArticleWriteInput) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/wiki/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update wiki article."
        );
      }

      toast({
        title: "Wiki article updated",
        description: "Your changes were saved successfully.",
      });
      router.push("/cms/dashboard/wiki");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save changes.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </Box>
    );
  }

  if (!article) {
    return (
      <Box className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Wiki article not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The article may have been deleted or the link may be invalid.
        </p>
        <Box className="mt-4">
          <Link href="/cms/dashboard/wiki">
            <Button>Back to Wiki List</Button>
          </Link>
        </Box>
      </Box>
    );
  }

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
            Edit Wiki Article
          </h1>
          <p className="text-sm text-slate-500">
            Update content and metadata. Changes are live immediately.
          </p>
        </Box>
      </Box>
      <WikiArticleForm
        initialData={article}
        isLoading={isSaving}
        onSubmit={onSubmit}
      />
    </Box>
  );
}
