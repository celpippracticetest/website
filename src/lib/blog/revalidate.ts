import { revalidatePath } from "next/cache";

export function revalidateBlogPages(slug?: string | null) {
  revalidatePath("/blog");
  revalidatePath("/blog-sitemap.xml");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}
