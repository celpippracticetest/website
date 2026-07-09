"use client";

import { useState } from "react";
import { Box } from "@/components/ui/Box";
import { Typography } from "@mui/material";
import { toast } from "@/components/ui/use-toast";
import BlogPostForm, { BlogPostSubmitPayload } from "@/components/dashboard-app/cms/BlogPostForm";

export default function CmsBlogPage() {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: BlogPostSubmitPayload) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/blog/cms-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorData = responseData;
        throw new Error(errorData.message || "Failed to create blog post.");
      }

      const linkedinMessage =
        responseData?.linkedin?.attempted === true
          ? responseData.linkedin.success
            ? " LinkedIn post was published successfully."
            : ` LinkedIn post failed: ${responseData.linkedin.message || "Unknown error."}`
          : "";

      toast({
        title: "Blog post created",
        description: `The blog post has been saved successfully.${linkedinMessage}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
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
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-5xl space-y-6">
        <Box className="rounded-lg bg-white p-5 shadow">
          <Typography variant="h4" component="h1" className="font-bold text-slate-900">
            Create Blog Post
          </Typography>
          <Typography variant="body2" className="mt-1 text-slate-500">
            Add content and SEO details for a new blog post.
          </Typography>
        </Box>

        <BlogPostForm isLoading={isLoading} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}
