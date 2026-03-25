"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Autorenew from "@mui/icons-material/Autorenew";
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
