"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BlogPostsTable from "@/components/dashboard-app/cms/BlogPostsTable";
import { TBlogSchemaDto } from "@/models/blog.model";

type ApiResult = {
  items: TBlogSchemaDto[];
  totalItems: number;
  totalPages: number;
};

export default function CmsBlogPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [data, setData] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const apiPage = page - 1;
        const params = new URLSearchParams({
          page: apiPage.toString(),
          limit: pageSize.toString(),
        });
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const response = await fetch(`/api/blog?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load blog posts.");
        }

        const result = await response.json();
        setData({
          items: result.items ?? [],
          totalItems: result.totalItems ?? 0,
          totalPages: result.totalPages ?? 0,
        });
      } catch (error) {
        console.error(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, [page, pageSize, statusFilter]);

  const refreshCurrentPage = async () => {
    const apiPage = page - 1;
    const params = new URLSearchParams({
      page: apiPage.toString(),
      limit: pageSize.toString(),
    });
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    const response = await fetch(`/api/blog?${params.toString()}`);
    const result = await response.json();
    setData({
      items: result.items ?? [],
      totalItems: result.totalItems ?? 0,
      totalPages: result.totalPages ?? 0,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete blog post.");
      }
      await refreshCurrentPage();
    } catch (error) {
      console.error(error);
      alert("Could not delete this blog post.");
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-7xl space-y-4">
        <Box className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow sm:flex-row sm:items-center sm:justify-between">
          <Box>
            <h1 className="text-2xl font-bold text-slate-900">Blog Posts</h1>
            <p className="text-sm text-slate-500">
              Manage and publish SEO-ready blog content for your marketing pages.
            </p>
          </Box>
          <Box className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "draft" | "published") => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => router.push("/cms/dashboard/blog/create")}>Create Post</Button>
          </Box>
        </Box>

        <BlogPostsTable
          posts={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          page={page}
          pageSize={pageSize}
          totalItems={data?.totalItems ?? 0}
          onPageChange={setPage}
          onEdit={(id) => router.push(`/cms/dashboard/blog/${id}`)}
          onDelete={handleDelete}
        />
      </Box>
    </Box>
  );
}
