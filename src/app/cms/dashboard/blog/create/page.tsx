"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ChevronLeft } from "lucide-react";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import BlogPostForm, { BlogPostSubmitPayload } from "@/components/dashboard-app/cms/BlogPostForm";

export default function CreateBlogPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: BlogPostSubmitPayload) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/blog", {
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
      router.push("/cms/dashboard/blog");
      router.refresh();
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
    <Box className="mx-auto max-w-5xl p-4 md:p-6">
      <Box className="mb-6 flex items-center gap-4">
        <Link href="/cms/dashboard/blog">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Box>
          <h1 className="text-2xl font-bold text-slate-900">Create Blog Post</h1>
          <p className="text-sm text-slate-500">
            Add content and SEO details to publish on the main blog page.
          </p>
        </Box>
      </Box>
      <BlogPostForm isLoading={isLoading} onSubmit={onSubmit} />
    </Box>
  );
}
