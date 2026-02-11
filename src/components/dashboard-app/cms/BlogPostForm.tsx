"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { JSONContent } from "@tiptap/core";
import { Check, Loader2, PlusCircle, Trash2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
});

type BlogFormValues = z.infer<typeof blogFormSchema>;

type BlogPostFormProps = {
  initialData?: TBlogSchemaDto | null;
  isLoading: boolean;
  onSubmit: (data: TBlogWriteInput) => Promise<void>;
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

export default function BlogPostForm({ initialData, onSubmit, isLoading }: BlogPostFormProps) {
  const [slugEdited, setSlugEdited] = useState(Boolean(initialData?.slug));
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

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

  const submitForm = async (values: BlogFormValues) => {
    const categories = splitCsv(values.categoriesInput);
    const tags = splitCsv(values.tagsInput);
    const keywords = splitCsv(values.keywordsInput);

    const payload: TBlogWriteInput = {
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
        : undefined,
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

        <FormField
          control={form.control}
          name="contentHtml"
          render={() => (
            <FormItem>
              <FormLabel>Blog Content</FormLabel>
              <FormControl>
                <TiptapBlogEditor
                  initialContent={getInitialJson(form.getValues("contentJson"))}
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
                      <Box className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Image uploaded</span>
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
                    <Trash2 className="h-4 w-4" />
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
              <PlusCircle className="mr-2 h-4 w-4" />
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

        <Box className="flex items-center justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
