import mongoClient from "@/lib/mongodb";
import { BlogRepository } from "@/repositories/blog.repo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const excludeId = req.nextUrl.searchParams.get("excludeId") ?? undefined;
    const repo = new BlogRepository(mongoClient);

    const existing = await repo.findBlogBySlug(slug);
    if (!existing) {
      return NextResponse.json({ available: true }, { status: 200 });
    }

    const isCurrent = excludeId && existing.id === excludeId;
    return NextResponse.json({ available: Boolean(isCurrent) }, { status: 200 });
  } catch (error) {
    console.error("Failed to validate slug:", error);
    return NextResponse.json({ message: "Failed to validate slug." }, { status: 500 });
  }
}
