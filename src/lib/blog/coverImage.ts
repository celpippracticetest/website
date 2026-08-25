import type { TBlogSchemaDto } from "@/models/blog.model";

type BlogCoverSource = Pick<TBlogSchemaDto, "title" | "featuredImage" | "seo">;

export function getBlogCoverImage(post: BlogCoverSource): {
  url: string;
  alt: string;
} | null {
  const url =
    post.featuredImage?.url?.trim() || post.seo?.ogImageUrl?.trim() || "";
  if (!url) {
    return null;
  }

  return {
    url,
    alt:
      post.featuredImage?.alt?.trim() ||
      post.seo?.ogImageAlt?.trim() ||
      post.title,
  };
}
