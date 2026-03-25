"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { JSONContent } from "@tiptap/core";
import Check from "@mui/icons-material/Check";
import Copy from "@mui/icons-material/ContentCopy";
import Autorenew from "@mui/icons-material/Autorenew";
import AddCircle from "@mui/icons-material/AddCircle";
import Sparkles from "@mui/icons-material/AutoAwesome";
import Delete from "@mui/icons-material/Delete";
import Upload from "@mui/icons-material/CloudUpload";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { TBlogSchemaDto, TBlogWriteInput } from "@/models/blog.model";
import TiptapBlogEditor from "./TiptapBlogEditor";

const blogFaqItemSchema = z.object({
  question: z.string().trim().min(1, "Question is required."),
  answer: z.string().trim().min(1, "Answer is required."),
});

const blogAiSnippetSchema = z.object({
  question: z.string().trim().optional(),
  answer: z.string().trim().max(400, "Keep answer under 400 characters (approx 50-60 words) for best snippet chance.").optional(),
});

const blogFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  status: z.enum(["draft", "published"]),
  excerpt: z.string().trim().max(320, "Excerpt must be under 320 characters."),
  authorName: z.string().trim().min(2, "Author name is required."),
  categoriesInput: z.string().optional(),
  tagsInput: z.string().optional(),
  featuredImageUrl: z.string().trim().optional(),
  featuredImageAlt: z.string().trim().optional(),
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  canonicalUrl: z.string().trim().optional(),
  ogImageUrl: z.string().trim().optional(),
  ogImageAlt: z.string().trim().optional(),
  keywordsInput: z.string().optional(),
  publishedAt: z.string().optional(),
  contentHtml: z.string(),
  contentJson: z.any().nullable().optional(),
  faq: z.array(blogFaqItemSchema).optional().default([]),
  aiSnippet: blogAiSnippetSchema.optional(),
  publishToLinkedIn: z.boolean().default(false),
});

type BlogFormValues = z.infer<typeof blogFormSchema>;
export type BlogPostSubmitPayload = TBlogWriteInput & { publishToLinkedIn?: boolean };

type BlogPostFormProps = {
  initialData?: TBlogSchemaDto | null;
  isLoading: boolean;
  onSubmit: (data: BlogPostSubmitPayload) => Promise<void>;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDatetimeLocal(value?: Date | string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getInitialJson(value?: unknown): JSONContent | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as JSONContent;
}

const BLOG_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://celpippracticetest.com";
const BLOG_JSON_SAMPLE = JSON.stringify(
  {
    title: "CELPIP Reading Tips to Increase Your Score Fast",
    slug: "celpip-reading-tips-increase-score-fast",
    status: "draft",
    excerpt: "Learn practical reading strategies to improve speed, accuracy, and confidence in the CELPIP reading section.",
    authorName: "CELPIP Practice Test Team",
    categories: ["Reading", "Study Plan"],
    tags: ["celpip reading", "time management", "score improvement"],
    featuredImage: {
      url: "https://celpippracticetest.com/images/blog/reading-tips-cover.jpg",
      alt: "Student preparing for CELPIP reading section",
    },
    seo: {
      metaTitle: "CELPIP Reading Tips: Improve Score with Smart Strategy",
      metaDescription: "Use these proven CELPIP reading tips to improve speed, avoid common mistakes, and increase your score.",
      canonicalUrl: "https://celpippracticetest.com/blog/celpip-reading-tips-increase-score-fast",
      ogImageUrl: "https://celpippracticetest.com/images/blog/reading-tips-cover.jpg",
      ogImageAlt: "CELPIP reading preparation desk setup",
      keywords: ["CELPIP reading tips", "CELPIP score", "CELPIP preparation"],
    },
    publishedAt: "2026-03-04T09:00:00.000Z",
    contentHtml:
      "<h2>Why reading strategy matters</h2><p>Strong reading performance requires timing, pattern recognition, and targeted practice...</p>",
    faq: [
      {
        question: "How can I improve CELPIP reading score quickly?",
        answer: "Practice with timed sets daily, review wrong answers carefully, and use keyword scanning to locate key details faster.",
      },
    ],
    aiSnippet: {
      question: "How do I get a higher CELPIP reading score?",
      answer:
        "Focus on timed practice, question-type strategy, and error analysis. Improving speed without losing accuracy is the fastest path to better CELPIP reading results.",
    },
    publishToLinkedIn: false,
  },
  null,
  2
);

type BlogJsonImportInput = Partial<
  TBlogWriteInput & {
    categoriesInput: string;
    tagsInput: string;
    keywordsInput: string;
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    ogImageUrl: string;
    ogImageAlt: string;
    featuredImageUrl: string;
    featuredImageAlt: string;
    publishToLinkedIn: boolean;
  }
>;

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export default function BlogPostForm({ initialData, onSubmit, isLoading }: BlogPostFormProps) {
  const [slugEdited, setSlugEdited] = useState(Boolean(initialData?.slug));
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoAdvicePrompt, setSeoAdvicePrompt] = useState("");
  const [isApplyingSeoFixes, setIsApplyingSeoFixes] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [editorContentKey, setEditorContentKey] = useState(0);

  const defaultValues: BlogFormValues = useMemo(
    () => ({
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      status: initialData?.status ?? "draft",
      excerpt: initialData?.excerpt ?? "",
      authorName: initialData?.authorName ?? "CELPIP Practice Test Team",
      categoriesInput: (initialData?.categories ?? []).join(", "),
      tagsInput: (initialData?.tags ?? []).join(", "),
      featuredImageUrl: initialData?.featuredImage?.url ?? "",
      featuredImageAlt: initialData?.featuredImage?.alt ?? "",
      metaTitle: initialData?.seo?.metaTitle ?? "",
      metaDescription: initialData?.seo?.metaDescription ?? "",
      canonicalUrl:
        initialData?.seo?.canonicalUrl ??
        (initialData?.slug ? `${BLOG_BASE_URL}/blog/${initialData.slug}` : ""),
      ogImageUrl: initialData?.seo?.ogImageUrl ?? initialData?.featuredImage?.url ?? "",
      ogImageAlt: initialData?.seo?.ogImageAlt ?? initialData?.featuredImage?.alt ?? "",
      keywordsInput: (initialData?.seo?.keywords ?? []).join(", "),
      publishedAt: toDatetimeLocal(initialData?.publishedAt),
      contentHtml: initialData?.contentHtml ?? "",
      contentJson: getInitialJson(initialData?.contentJson),
      faq: (initialData?.faq ?? []).map((item) => ({ question: item.question, answer: item.answer })),
      aiSnippet: {
        question: initialData?.aiSnippet?.question ?? "",
        answer: initialData?.aiSnippet?.answer ?? "",
      },
      publishToLinkedIn: false,
    }),
    [initialData]
  );

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues,
  });

  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({
    control: form.control,
    name: "faq",
  });

  const title = form.watch("title");
  const slug = form.watch("slug");
  const canonicalUrl = form.watch("canonicalUrl");
  const ogImageUrl = form.watch("ogImageUrl");

  useEffect(() => {
    if (!slugEdited) {
      form.setValue("slug", slugify(title), { shouldValidate: true });
    }
  }, [title, slugEdited, form]);

  useEffect(() => {
    if (slug && !canonicalUrl?.trim()) {
      form.setValue("canonicalUrl", `${BLOG_BASE_URL}/blog/${slug}`, { shouldValidate: false });
    }
  }, [slug, canonicalUrl, form]);

  const featuredImageUrl = form.watch("featuredImageUrl");

  const handleGenerateWithAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast({
        title: "Prompt required",
        description: "Enter a prompt to generate blog content.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const title = form.getValues("title")?.trim() || undefined;
      const response = await fetch("/api/blog/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate content.");
      }
      // Fill all form fields from AI response
      if (data.title != null) form.setValue("title", String(data.title).trim(), { shouldDirty: true });
      if (data.slug != null) {
        form.setValue("slug", slugify(String(data.slug)), { shouldDirty: true });
        setSlugEdited(true);
      }
      if (data.excerpt != null) form.setValue("excerpt", String(data.excerpt).trim().slice(0, 320), { shouldDirty: true });
      if (data.contentHtml != null) {
        form.setValue("contentHtml", String(data.contentHtml).trim(), { shouldDirty: true });
        form.setValue("contentJson", null, { shouldDirty: true });
        setEditorContentKey((k) => k + 1);
      }
      if (data.metaTitle != null) form.setValue("metaTitle", String(data.metaTitle).trim().slice(0, 70), { shouldDirty: true });
      if (data.metaDescription != null) form.setValue("metaDescription", String(data.metaDescription).trim().slice(0, 160), { shouldDirty: true });
      if (data.keywordsInput != null) form.setValue("keywordsInput", String(data.keywordsInput).trim(), { shouldDirty: true });
      if (data.categoriesInput != null) form.setValue("categoriesInput", String(data.categoriesInput).trim(), { shouldDirty: true });
      if (data.tagsInput != null) form.setValue("tagsInput", String(data.tagsInput).trim(), { shouldDirty: true });
      if (Array.isArray(data.faq) && data.faq.length > 0) {
        form.setValue(
          "faq",
          data.faq.map((item: { question?: string; answer?: string }) => ({
            question: String(item?.question ?? "").trim(),
            answer: String(item?.answer ?? "").trim(),
          })),
          { shouldDirty: true }
        );
      }
      if (data.aiSnippet && typeof data.aiSnippet === "object") {
        form.setValue("aiSnippet.question", String(data.aiSnippet.question ?? "").trim(), { shouldDirty: true });
        form.setValue("aiSnippet.answer", String(data.aiSnippet.answer ?? "").trim().slice(0, 400), { shouldDirty: true });
      }
      toast({
        title: "Form filled with AI",
        description: "All fields have been filled from your prompt. Review and edit before saving.",
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
        description: "Describe what you want to improve (keywords, title/H1, headings, meta, etc.).",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingSeoFixes(true);
    try {
      const response = await fetch("/api/blog/apply-seo-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advice: prompt,
          current: {
            title: form.getValues("title"),
            excerpt: form.getValues("excerpt"),
            metaTitle: form.getValues("metaTitle"),
            metaDescription: form.getValues("metaDescription"),
            keywordsInput: form.getValues("keywordsInput"),
            contentHtml: form.getValues("contentHtml"),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to apply SEO fixes.");
      }

      if (data.title != null && typeof data.title === "string") {
        form.setValue("title", String(data.title).trim(), { shouldDirty: true });
      }
      if (data.excerpt != null && typeof data.excerpt === "string") {
        form.setValue("excerpt", String(data.excerpt).trim().slice(0, 320), { shouldDirty: true });
      }
      if (data.metaTitle != null && typeof data.metaTitle === "string") {
        form.setValue("metaTitle", String(data.metaTitle).trim().slice(0, 70), { shouldDirty: true });
      }
      if (data.metaDescription != null && typeof data.metaDescription === "string") {
        form.setValue("metaDescription", String(data.metaDescription).trim().slice(0, 160), { shouldDirty: true });
      }
      if (data.keywordsInput != null && typeof data.keywordsInput === "string") {
        form.setValue("keywordsInput", String(data.keywordsInput).trim(), { shouldDirty: true });
      }

      if (data.contentHtml != null && typeof data.contentHtml === "string" && data.contentHtml.trim()) {
        form.setValue("contentHtml", String(data.contentHtml).trim(), { shouldDirty: true });
        // Ensure the editor re-initializes from HTML.
        form.setValue("contentJson", null, { shouldDirty: true });
        setEditorContentKey((k) => k + 1);
      }

      toast({
        title: "AI SEO fixes applied",
        description: "Review the updated title/content/meta/keywords, then save the post.",
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

  const handleFillWithJson = () => {
    try {
      setJsonImportError(null);
      const parsed = JSON.parse(jsonInput) as BlogJsonImportInput;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("JSON root must be an object.");
      }

      if (typeof parsed.title === "string") {
        form.setValue("title", parsed.title.trim(), { shouldDirty: true });
      }

      if (typeof parsed.slug === "string") {
        form.setValue("slug", slugify(parsed.slug), { shouldDirty: true });
        setSlugEdited(true);
      }

      if (parsed.status === "draft" || parsed.status === "published") {
        form.setValue("status", parsed.status, { shouldDirty: true });
      }

      if (typeof parsed.excerpt === "string") {
        form.setValue("excerpt", parsed.excerpt.trim().slice(0, 320), { shouldDirty: true });
      }

      if (typeof parsed.authorName === "string") {
        form.setValue("authorName", parsed.authorName.trim(), { shouldDirty: true });
      }

      const categoriesInput =
        typeof parsed.categoriesInput === "string"
          ? parsed.categoriesInput
          : normalizeStringArray(parsed.categories).join(", ");
      if (categoriesInput) {
        form.setValue("categoriesInput", categoriesInput, { shouldDirty: true });
      }

      const tagsInput =
        typeof parsed.tagsInput === "string" ? parsed.tagsInput : normalizeStringArray(parsed.tags).join(", ");
      if (tagsInput) {
        form.setValue("tagsInput", tagsInput, { shouldDirty: true });
      }

      const featuredImageUrl =
        typeof parsed.featuredImageUrl === "string"
          ? parsed.featuredImageUrl
          : typeof parsed.featuredImage?.url === "string"
            ? parsed.featuredImage.url
            : "";
      if (featuredImageUrl) {
        form.setValue("featuredImageUrl", featuredImageUrl.trim(), { shouldDirty: true, shouldValidate: true });
      }

      const featuredImageAlt =
        typeof parsed.featuredImageAlt === "string"
          ? parsed.featuredImageAlt
          : typeof parsed.featuredImage?.alt === "string"
            ? parsed.featuredImage.alt
            : "";
      if (featuredImageAlt) {
        form.setValue("featuredImageAlt", featuredImageAlt.trim(), { shouldDirty: true });
      }

      if (typeof parsed.metaTitle === "string" || typeof parsed.seo?.metaTitle === "string") {
        form.setValue("metaTitle", String(parsed.metaTitle ?? parsed.seo?.metaTitle ?? "").trim().slice(0, 70), {
          shouldDirty: true,
        });
      }

      if (typeof parsed.metaDescription === "string" || typeof parsed.seo?.metaDescription === "string") {
        form.setValue(
          "metaDescription",
          String(parsed.metaDescription ?? parsed.seo?.metaDescription ?? "").trim().slice(0, 160),
          {
            shouldDirty: true,
          }
        );
      }

      if (typeof parsed.canonicalUrl === "string" || typeof parsed.seo?.canonicalUrl === "string") {
        form.setValue("canonicalUrl", String(parsed.canonicalUrl ?? parsed.seo?.canonicalUrl ?? "").trim(), {
          shouldDirty: true,
        });
      }

      if (typeof parsed.ogImageUrl === "string" || typeof parsed.seo?.ogImageUrl === "string") {
        form.setValue("ogImageUrl", String(parsed.ogImageUrl ?? parsed.seo?.ogImageUrl ?? "").trim(), {
          shouldDirty: true,
        });
      }

      if (typeof parsed.ogImageAlt === "string" || typeof parsed.seo?.ogImageAlt === "string") {
        form.setValue("ogImageAlt", String(parsed.ogImageAlt ?? parsed.seo?.ogImageAlt ?? "").trim(), {
          shouldDirty: true,
        });
      }

      const keywordsInput =
        typeof parsed.keywordsInput === "string"
          ? parsed.keywordsInput
          : normalizeStringArray(parsed.seo?.keywords).join(", ");
      if (keywordsInput) {
        form.setValue("keywordsInput", keywordsInput, { shouldDirty: true });
      }

      if (parsed.publishedAt) {
        form.setValue("publishedAt", toDatetimeLocal(parsed.publishedAt), { shouldDirty: true });
      }

      let shouldRefreshEditor = false;
      if (typeof parsed.contentHtml === "string") {
        form.setValue("contentHtml", parsed.contentHtml, { shouldDirty: true });
        shouldRefreshEditor = true;
      }

      if (parsed.contentJson === null || (parsed.contentJson && typeof parsed.contentJson === "object")) {
        form.setValue("contentJson", parsed.contentJson, { shouldDirty: true });
        shouldRefreshEditor = true;
      }

      if (shouldRefreshEditor) {
        setEditorContentKey((k) => k + 1);
      }

      if (Array.isArray(parsed.faq)) {
        form.setValue(
          "faq",
          parsed.faq.map((item) => ({
            question: String(item?.question ?? "").trim(),
            answer: String(item?.answer ?? "").trim(),
          })),
          { shouldDirty: true }
        );
      }

      if (parsed.aiSnippet && typeof parsed.aiSnippet === "object") {
        form.setValue("aiSnippet.question", String(parsed.aiSnippet.question ?? "").trim(), { shouldDirty: true });
        form.setValue("aiSnippet.answer", String(parsed.aiSnippet.answer ?? "").trim().slice(0, 400), {
          shouldDirty: true,
        });
      }

      if (typeof parsed.publishToLinkedIn === "boolean") {
        form.setValue("publishToLinkedIn", parsed.publishToLinkedIn, { shouldDirty: true });
      }

      toast({
        title: "Form filled with JSON",
        description: "All matching fields were imported. Review and save when ready.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON.";
      setJsonImportError(message);
      toast({
        title: "JSON import failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCopySampleJson = async () => {
    try {
      await navigator.clipboard.writeText(BLOG_JSON_SAMPLE);
      toast({
        title: "Sample copied",
        description: "Sample JSON copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy sample JSON. Copy it manually from the textarea.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (featuredImageUrl?.trim() && !ogImageUrl?.trim()) {
      form.setValue("ogImageUrl", featuredImageUrl.trim(), { shouldValidate: false });
      const alt = form.getValues("featuredImageAlt");
      if (alt && !form.getValues("ogImageAlt")?.trim()) {
        form.setValue("ogImageAlt", alt, { shouldValidate: false });
      }
    }
  }, [featuredImageUrl, ogImageUrl, form]);

  const handleFeaturedImageUpload = async (file: File) => {
    setImageUploadError(null);
    setIsImageUploading(true);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch("/api/blog/upload-image", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message ?? "Image upload failed.");
      }

      const result = await response.json();
      const uploadedUrl: string = result.url;

      form.setValue("featuredImageUrl", uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleRemoveFeaturedImage = () => {
    const currentFeaturedImageUrl = featuredImageUrl?.trim();
    const currentFeaturedImageAlt = form.getValues("featuredImageAlt")?.trim();
    const currentOgImageUrl = form.getValues("ogImageUrl")?.trim();
    const currentOgImageAlt = form.getValues("ogImageAlt")?.trim();

    form.setValue("featuredImageUrl", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("featuredImageAlt", "", { shouldDirty: true, shouldValidate: true });

    if (currentOgImageUrl && currentFeaturedImageUrl && currentOgImageUrl === currentFeaturedImageUrl) {
      form.setValue("ogImageUrl", "", { shouldDirty: true, shouldValidate: true });
    }

    if (currentOgImageAlt && currentFeaturedImageAlt && currentOgImageAlt === currentFeaturedImageAlt) {
      form.setValue("ogImageAlt", "", { shouldDirty: true, shouldValidate: true });
    }
  };

  const submitForm = async (values: BlogFormValues) => {
    const categories = splitCsv(values.categoriesInput);
    const tags = splitCsv(values.tagsInput);
    const keywords = splitCsv(values.keywordsInput);

    const payload: BlogPostSubmitPayload = {
      title: values.title.trim(),
      slug: slugify(values.slug),
      status: values.status,
      excerpt: values.excerpt.trim(),
      contentHtml: values.contentHtml,
      contentJson: values.contentJson ?? null,
      authorName: values.authorName.trim(),
      categories,
      tags,
      featuredImage: values.featuredImageUrl?.trim()
        ? {
            url: values.featuredImageUrl.trim(),
            alt: values.featuredImageAlt?.trim() ?? "",
          }
        : null,
      seo: {
        metaTitle: values.metaTitle?.trim() || undefined,
        metaDescription: values.metaDescription?.trim() || undefined,
        canonicalUrl: values.canonicalUrl?.trim() || `${BLOG_BASE_URL}/blog/${slugify(values.slug)}`,
        ogImageUrl: values.ogImageUrl?.trim() || values.featuredImageUrl?.trim() || undefined,
        ogImageAlt: values.ogImageAlt?.trim() || values.featuredImageAlt?.trim() || undefined,
        keywords,
      },
      publishedAt: values.publishedAt ? new Date(values.publishedAt) : null,
      faq: (values.faq ?? []).filter((item) => item.question.trim() && item.answer.trim()),
      aiSnippet: values.aiSnippet?.question?.trim() || values.aiSnippet?.answer?.trim() 
        ? {
            question: values.aiSnippet.question?.trim() ?? "",
            answer: values.aiSnippet.answer?.trim() ?? "",
          }
        : undefined,
      publishToLinkedIn: values.publishToLinkedIn,
    };

    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitForm)} className="space-y-6 rounded-lg bg-white p-6 shadow">
        <Box className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Blog Details</h2>
          <p className="text-sm text-slate-500">
            Add structured metadata now so each blog page is SEO-ready on publish.
          </p>
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
                    <Input placeholder="Example: CELPIP Reading Tips for Faster Scores" {...field} />
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
                      placeholder="celpip-reading-tips-faster-scores"
                      {...field}
                      onChange={(event) => {
                        setSlugEdited(true);
                        field.onChange(slugify(event.target.value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>Used as the URL: `/blog/your-slug`</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Box>

          <Box className="flex-1 space-y-6">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publish Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty for drafts. For published posts, this supports backdating.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="publishToLinkedIn"
              render={({ field }) => (
                <FormItem className="rounded-md border border-slate-200 p-4">
                  <Box className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                    </FormControl>
                    <Box>
                      <FormLabel>Publish to LinkedIn after save</FormLabel>
                      <FormDescription>
                        Posts this blog URL directly to LinkedIn when status is set to published.
                      </FormDescription>
                    </Box>
                  </Box>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Box>
        </Box>

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Short summary shown on blog cards and search snippets."
                  className="min-h-[90px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Box className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Fill entire form with AI
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Describe the topic or outline. AI will fill title, slug, excerpt, full content, SEO fields, categories, tags, FAQ, and AI snippet. Optional: add a title above for context.
          </p>
          <Box className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              placeholder="e.g. Explain how to improve CELPIP reading score in 4 weeks with a study plan and time management tips"
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

        <Box className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Fill entire form with JSON
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Paste a JSON object and import it to auto-fill title, content, taxonomy, image, FAQ, AI snippet, and SEO fields.
          </p>
          <Box className="space-y-3">
            <Textarea
              placeholder='Paste blog JSON object here, e.g. {"title":"...","slug":"..."}'
              className="min-h-[180px] bg-white font-mono text-xs"
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
            />
            {jsonImportError ? <p className="text-sm text-red-600">{jsonImportError}</p> : null}
            <Box className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleFillWithJson}>
                Fill form from JSON
              </Button>
              <Button type="button" variant="outline" onClick={() => setJsonInput(BLOG_JSON_SAMPLE)}>
                Use sample JSON
              </Button>
            </Box>
            <Box className="rounded-md border border-slate-200 bg-white p-3">
              <Box className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Admin sample JSON</p>
                <Button type="button" variant="ghost" size="sm" onClick={handleCopySampleJson}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy sample
                </Button>
              </Box>
              <Textarea readOnly value={BLOG_JSON_SAMPLE} className="min-h-[220px] bg-slate-50 font-mono text-xs" />
            </Box>
          </Box>
        </Box>

        <FormField
          control={form.control}
          name="contentHtml"
          render={() => (
            <FormItem>
              <FormLabel>Blog Content</FormLabel>
              <FormControl>
                <TiptapBlogEditor
                  key={editorContentKey}
                  initialContent={
                    getInitialJson(form.getValues("contentJson")) ??
                    (form.getValues("contentHtml")?.trim() || null)
                  }
                  onChange={(payload) => {
                    form.setValue("contentHtml", payload.html, { shouldDirty: true });
                    form.setValue("contentJson", payload.json, { shouldDirty: true });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Box className="rounded-md border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">Taxonomy and Author</h3>
          <Box className="mt-4 flex flex-col gap-4 md:flex-row">
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author Name</FormLabel>
                    <FormControl>
                      <Input placeholder="CELPIP Practice Test Team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="categoriesInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="Reading, Writing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>
          <Box className="mt-4">
            <FormField
              control={form.control}
              name="tagsInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="Time management, templates, score improvement" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Box>
        </Box>

        <Box className="rounded-md border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">Featured Image</h3>
          <Box className="mt-4 flex flex-col gap-4 md:flex-row">
            <Box className="flex-1">
              <FormItem>
                <FormLabel>Upload Image</FormLabel>
                <FormControl>
                  <Box className="space-y-3">
                    <label
                      htmlFor="blog-featured-image"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isImageUploading ? "Uploading..." : "Upload Featured Image"}</span>
                    </label>
                    <Input
                      id="blog-featured-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isImageUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleFeaturedImageUpload(file);
                        }
                      }}
                    />
                    {featuredImageUrl ? (
                      <Box className="flex flex-wrap items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Image uploaded</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={handleRemoveFeaturedImage}
                        >
                          Remove image
                        </Button>
                      </Box>
                    ) : null}
                    {imageUploadError ? (
                      <p className="text-sm text-red-600">{imageUploadError}</p>
                    ) : null}
                    {featuredImageUrl ? (
                      <img
                        src={featuredImageUrl}
                        alt={form.getValues("featuredImageAlt") || "Uploaded featured image"}
                        className="max-h-64 w-full rounded-md border border-slate-200 object-cover"
                      />
                    ) : null}
                  </Box>
                </FormControl>
                <FormDescription>Upload directly from your device. URL is saved automatically.</FormDescription>
              </FormItem>
            </Box>
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="featuredImageAlt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Alt</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe the image for accessibility and SEO." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>
        </Box>

        <Box className="rounded-md border border-slate-200 p-4">
          <Box className="mb-4 rounded-md bg-blue-50 p-4 border border-blue-100">
            <h3 className="flex items-center gap-2 text-base font-semibold text-blue-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">AI</span>
              AI Search Snippet (DEO Strategy)
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              This is the <strong>most important</strong> field for 2026 SEO. Enter a target question and a concise ~50 word answer. This will be prioritized as the first item in your FAQ schema to help AI engines (Perplexity, Gemini) find and quote your answer.
            </p>
            <Box className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="aiSnippet.question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-blue-900">Target Question</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. How to get CLB 9 in CELPIP?" className="bg-white" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aiSnippet.answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-blue-900">
                      50-Word Answer
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        ({field.value?.length || 0}/400 chars)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Direct, concise answer. Avoid fluff. Example: 'To jump from CLB 8 to 9, you must...'"
                        className="min-h-[100px] bg-white"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>

          <h3 className="text-base font-semibold text-slate-900">Additional FAQ</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add Q&A pairs for FAQPage schema. Keeps answers visible on the post and in JSON-LD for AI search (Perplexity, Gemini). Match or summarize your article content.
          </p>
          <Box className="mt-4 space-y-4">
            {faqFields.map((field, index) => (
              <Box key={field.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <Box className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">FAQ {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFaq(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Delete className="h-4 w-4" />
                  </Button>
                </Box>
                <FormField
                  control={form.control}
                  name={`faq.${index}.question`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Why am I stuck at CLB 8 in CELPIP?" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`faq.${index}.answer`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Answer</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Direct answer (used in schema and shown on page)."
                          className="min-h-[80px]"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Box>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendFaq({ question: "", answer: "" })}>
              <AddCircle className="mr-2 h-4 w-4" />
              Add FAQ item
            </Button>
          </Box>
        </Box>

        <Box className="rounded-md border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">SEO</h3>
          <Box className="mt-4 flex flex-col gap-4 md:flex-row">
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Optimized SEO title (max 70 characters)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Compelling SERP description (max 160 characters)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>
          <Box className="mt-4 flex flex-col gap-4 md:flex-row">
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="canonicalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canonical URL (optional override)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://celpippracticetest.com/blog/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="keywordsInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="CELPIP, reading tips, CELPIP writing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>
          <Box className="mt-4 flex flex-col gap-4 md:flex-row">
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="ogImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
            <Box className="flex-1">
              <FormField
                control={form.control}
                name="ogImageAlt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG Image Alt</FormLabel>
                    <FormControl>
                      <Input placeholder="OpenGraph image description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Box>
          </Box>
        </Box>

        <Box className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-base font-semibold text-slate-900">
            AI SEO Fixes (Patch Title/Meta/Keywords/Content)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Enter SEO advice and required changes. AI can update your `Title` (this renders as the page H1), meta title/description, keywords, and weave keywords into the article content.
          </p>
          <Box className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              placeholder="Example: Add primary keyword 'CELPIP reading tips' throughout, adjust headings to include 'time management', and rewrite the meta title to be more specific for score improvement."
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
              "Save Blog Post"
            )}
          </Button>
        </Box>
      </form>
    </Form>
  );
}
