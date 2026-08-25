import { revalidatePath } from "next/cache";

export function revalidateBlogPages(slug?: string | null) {
  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}
