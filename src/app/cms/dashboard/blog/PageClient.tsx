"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Box } from "@/components/ui/Box";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published"
  >("all");
  const [data, setData] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as "all" | "draft" | "published";
    setPage(1);
    setStatusFilter(value);
  };

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
            <Typography
              variant="h4"
              component="h1"
              className="font-bold text-slate-900"
            >
              Blog Posts
            </Typography>
            <Typography variant="body2" className="text-slate-500">
              Manage and publish SEO-ready blog content for your marketing
              pages.
            </Typography>
          </Box>
          <Box className="flex items-center gap-3">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="blog-status-filter-label">Status</InputLabel>
              <Select
                labelId="blog-status-filter-label"
                label="Status"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="published">Published</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={() => router.push("/cms/dashboard/blog/create")}
              sx={{ textTransform: "none", borderRadius: 2, px: 2.5, py: 1 }}
            >
              Create Post
            </Button>
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
