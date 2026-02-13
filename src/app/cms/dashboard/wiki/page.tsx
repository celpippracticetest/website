"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import WikiArticlesTable from "@/components/dashboard-app/cms/WikiArticlesTable";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";
import { Download, Loader2 } from "lucide-react";

type ApiResult = {
  items: TWikiArticleSchemaDto[];
  totalItems: number;
};

export default function CmsWikiPage() {
  const router = useRouter();
  const [data, setData] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchWiki = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await fetch("/api/wiki");
      if (!response.ok) throw new Error("Failed to load wiki articles.");
      const result = await response.json();
      setData({
        items: result.items ?? [],
        totalItems: result.totalItems ?? 0,
      });
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWiki();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/wiki/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete wiki article.");
      await fetchWiki();
    } catch (error) {
      console.error(error);
      alert("Could not delete this wiki article.");
    }
  };

  const handleImportFromCode = async () => {
    setIsImporting(true);
    try {
      const response = await fetch("/api/wiki/seed", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || "Import failed.");
      }
      toast({
        title: "Import complete",
        description: result.message || `Imported ${result.count} articles.`,
      });
      await fetchWiki();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-7xl space-y-4">
        <Box className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow sm:flex-row sm:items-center sm:justify-between">
          <Box>
            <h1 className="text-2xl font-bold text-slate-900">Wiki Articles</h1>
            <p className="text-sm text-slate-500">
              Manage CELPIP Wiki content. Articles appear on /wiki and /wiki/[slug].
            </p>
          </Box>
          <Box className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleImportFromCode}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import from code
                </>
              )}
            </Button>
            <Button onClick={() => router.push("/cms/dashboard/wiki/create")}>
              Create Article
            </Button>
          </Box>
        </Box>

        <WikiArticlesTable
          articles={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          onEdit={(id) => router.push(`/cms/dashboard/wiki/${id}`)}
          onDelete={handleDelete}
        />
      </Box>
    </Box>
  );
}
