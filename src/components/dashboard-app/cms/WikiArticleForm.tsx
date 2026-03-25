"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Autorenew from "@mui/icons-material/Autorenew";
import Sparkles from "@mui/icons-material/AutoAwesome";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Box } from "@/components/ui/Box";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TWikiArticleSchemaDto, TWikiArticleWriteInput } from "@/models/wiki.model";

const wikiFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens."
    ),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().min(1, "Category is required.").max(80),
  color: z.string().trim().max(50).default("#3ebbf3"),
  summary: z.string().trim().max(500).default(""),
  content: z.string().min(0),
  sortOrder: z.coerce.number().int().min(0),
});

type WikiFormValues = z.infer<typeof wikiFormSchema>;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const CATEGORIES = ["General", "Reading", "Writing", "Listening", "Speaking"];

type WikiArticleFormProps = {
  initialData?: TWikiArticleSchemaDto | null;
  isLoading: boolean;
  onSubmit: (data: TWikiArticleWriteInput) => Promise<void>;
};

export default function WikiArticleForm({
  initialData,
  isLoading,
  onSubmit,
}: WikiArticleFormProps) {
  const [slugEdited, setSlugEdited] = useState(Boolean(initialData?.slug));
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoAdvicePrompt, setSeoAdvicePrompt] = useState("");
  const [isApplyingSeoFixes, setIsApplyingSeoFixes] = useState(false);

  const form = useForm<WikiFormValues>({
    resolver: zodResolver(wikiFormSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      category: initialData?.category ?? "General",
      color: initialData?.color ?? "#3ebbf3",
      summary: initialData?.summary ?? "",
      content: initialData?.content ?? "",
      sortOrder: initialData?.sortOrder ?? 0,
    },
  });

  const title = form.watch("title");

  useEffect(() => {
    if (!slugEdited) {
      form.setValue("slug", slugify(title), { shouldValidate: true });
    }
  }, [title, slugEdited, form]);

  const handleGenerateWithAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast({
        title: "Prompt required",
        description: "Enter a prompt to generate the wiki article.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const titleHint = form.getValues("title")?.trim() || undefined;
      const response = await fetch("/api/wiki/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title: titleHint }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate content.");
      }
      if (data.title != null) {
        form.setValue("title", String(data.title).trim().slice(0, 200), { shouldDirty: true });
      }
      if (data.slug != null) {
        form.setValue("slug", slugify(String(data.slug)), { shouldDirty: true });
        setSlugEdited(true);
      }
      if (data.description != null) {
        form.setValue("description", String(data.description).trim().slice(0, 500), {
          shouldDirty: true,
        });
      }
      if (data.category != null) {
        const c = String(data.category).trim();
        if (CATEGORIES.includes(c)) {
          form.setValue("category", c, { shouldDirty: true });
        }
      }
      if (data.color != null) {
        form.setValue("color", String(data.color).trim().slice(0, 50), { shouldDirty: true });
      }
      if (data.summary != null) {
        form.setValue("summary", String(data.summary).trim().slice(0, 500), { shouldDirty: true });
      }
      if (data.content != null) {
        form.setValue("content", String(data.content).trim(), { shouldDirty: true });
      }
      if (data.sortOrder != null && typeof data.sortOrder === "number") {
        form.setValue("sortOrder", Math.max(0, Math.floor(data.sortOrder)), { shouldDirty: true });
      }
      toast({
        title: "Form filled with AI",
        description: "Review and edit fields before saving.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySeoFixesWithAi = async () => {
    const prompt = seoAdvicePrompt.trim();
    if (!prompt) {
      toast({
        title: "SEO advice required",
        description: "Describe what to improve (keywords, title, description, content, etc.).",
        variant: "destructive",
      });
      return;
    }
    setIsApplyingSeoFixes(true);
    try {
      const response = await fetch("/api/wiki/apply-seo-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advice: prompt,
          current: {
            title: form.getValues("title"),
            description: form.getValues("description"),
            summary: form.getValues("summary"),
            content: form.getValues("content"),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to apply SEO fixes.");
      }
      if (data.title != null && typeof data.title === "string") {
        form.setValue("title", String(data.title).trim().slice(0, 200), { shouldDirty: true });
      }
      if (data.slug != null && typeof data.slug === "string") {
        form.setValue("slug", slugify(String(data.slug)), { shouldDirty: true });
        setSlugEdited(true);
      }
      if (data.description != null && typeof data.description === "string") {
        form.setValue("description", String(data.description).trim().slice(0, 500), {
          shouldDirty: true,
        });
      }
      if (data.summary != null && typeof data.summary === "string") {
        form.setValue("summary", String(data.summary).trim().slice(0, 500), { shouldDirty: true });
      }
      if (data.content != null && typeof data.content === "string" && data.content.trim()) {
        form.setValue("content", String(data.content).trim(), { shouldDirty: true });
      }
      toast({
        title: "AI SEO fixes applied",
        description: "Review title, slug, description, summary, and content, then save.",
      });
    } catch (err) {
      toast({
        title: "SEO fixes failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingSeoFixes(false);
    }
  };

  const submitForm = async (values: WikiFormValues) => {
    const payload: TWikiArticleWriteInput = {
      title: values.title.trim(),
      slug: slugify(values.slug),
      description: values.description.trim(),
      category: values.category.trim(),
      color: values.color.trim(),
      summary: values.summary.trim(),
      content: values.content,
      sortOrder: values.sortOrder,
    };
    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submitForm)}
        className="space-y-6 rounded-lg bg-white p-6 shadow"
      >
        <Box className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Wiki Article</h2>
          <p className="text-sm text-slate-500">
            Create or edit a CELPIP Wiki article. Content is HTML.
          </p>
        </Box>

        <Box className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Fill entire form with AI
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Describe the topic or outline. AI fills title, slug, description, category, banner color,
            summary, sort order, and HTML content. Optional: set Title first for extra context.
          </p>
          <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              placeholder="e.g. Wiki article on CELPIP speaking task 1: format, timing, and a sample response structure"
              className="min-h-[80px] flex-1 bg-white"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isGenerating}
              onClick={handleGenerateWithAi}
            >
              {isGenerating ? (
                <>
                  <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                  Filling form...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Fill form with AI
                </>
              )}
            </Button>
          </Box>
        </Box>

        <Box className="flex flex-col gap-6 md:flex-row">
          <Box className="flex-1 space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. CELPIP Score Guide"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="celpip-score-guide"
                      {...field}
                      onChange={(e) => {
                        setSlugEdited(true);
                        field.onChange(slugify(e.target.value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    URL path: /wiki/your-slug
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banner color</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="#3ebbf3"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Hex color for the article banner (e.g. #3ebbf3).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first in the wiki list.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Box>

          <Box className="flex-1 space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description for cards and SEO."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief summary for related/next article cards."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Box>
        </Box>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content (HTML)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="<h2>Heading</h2><p>Paragraph with <strong>bold</strong>...</p>"
                  className="min-h-[320px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Full HTML body. Use headings, lists, tables, and links as needed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Box className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-base font-semibold text-slate-900">
            AI SEO fixes (title, slug, description, summary, content)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Paste SEO advice or required changes. AI updates the title (page H1), URL slug, meta-style
            description, card summary, and weaves keywords into the HTML body.
          </p>
          <Box className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              placeholder="Example: Add keyword 'CELPIP speaking task 1' in the first paragraph, tighten the description to 155 characters, and align H2s with common search queries."
              className="min-h-[90px] flex-1 bg-white"
              value={seoAdvicePrompt}
              onChange={(e) => setSeoAdvicePrompt(e.target.value)}
              disabled={isApplyingSeoFixes}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isApplyingSeoFixes}
              onClick={handleApplySeoFixesWithAi}
            >
              {isApplyingSeoFixes ? (
                <>
                  <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                  Apply SEO fixes with AI
                </>
              )}
            </Button>
          </Box>
        </Box>

        <Box className="flex items-center justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Autorenew className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Wiki Article"
            )}
          </Button>
        </Box>
      </form>
    </Form>
  );
}
