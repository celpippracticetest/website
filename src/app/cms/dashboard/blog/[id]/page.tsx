"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import Autorenew from "@mui/icons-material/Autorenew";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import BlogPostForm, { BlogPostSubmitPayload } from "@/components/dashboard-app/cms/BlogPostForm";
import { TBlogSchemaDto } from "@/models/blog.model";

export default function EditBlogPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const [blog, setBlog] = useState<TBlogSchemaDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const response = await fetch(`/api/blog/${id}`);
        if (!response.ok) {
          throw new Error("Failed to load blog post.");
        }
        const data = await response.json();
        setBlog(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load blog post.";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  const onSubmit = async (values: BlogPostSubmitPayload) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/blog/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update blog post.");
      }

      toast({
        title: "Blog post updated",
        description: "Your changes were saved successfully.",
      });
      router.push("/cms/dashboard/blog");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save changes.";
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
        <Autorenew className="h-8 w-8 animate-spin text-slate-400" />
      </Box>
    );
  }

  if (!blog) {
    return (
      <Box className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Blog post not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The post may have been deleted or the link may be invalid.
        </p>
        <Box className="mt-4">
          <Link href="/cms/dashboard/blog">
            <Button>Back to Blog List</Button>
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="mx-auto max-w-5xl p-4 md:p-6">
      <Box className="mb-6 flex items-center gap-4">
        <Link href="/cms/dashboard/blog">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Box>
          <h1 className="text-2xl font-bold text-slate-900">Edit Blog Post</h1>
          <p className="text-sm text-slate-500">Update content, status, and SEO fields.</p>
        </Box>
      </Box>
      <BlogPostForm initialData={blog} isLoading={isSaving} onSubmit={onSubmit} />
    </Box>
  );
}
