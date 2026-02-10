import mongoClient from "@/lib/mongodb";
import { BlogWriteSchema, BlogStatusEnumSchema } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parser = BlogWriteSchema.safeParse(body);

    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    const repo = new BlogRepository(mongoClient);
    const blog = await repo.createBlog(parser.data);

    return NextResponse.json({ id: blog.id }, { status: 200 });
  } catch (error) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json({ message: "Failed to create blog post." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const statusValue = req.nextUrl.searchParams.get("status");
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    const tag = req.nextUrl.searchParams.get("tag") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);

    const statusParser = statusValue
      ? BlogStatusEnumSchema.safeParse(statusValue)
      : { success: true as const, data: undefined };

    if (!statusParser.success) {
      return NextResponse.json({ message: "Invalid status filter." }, { status: 400 });
    }

    const repo = new BlogRepository(mongoClient);
    const result = await repo.getAllBlogs(
      {
        status: statusParser.data,
        category,
        tag,
        search,
      },
      page,
      limit
    );

    return NextResponse.json(
      {
        ...result,
        filters: { status: statusParser.data ?? null, category, tag, search },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return NextResponse.json({ message: "Failed to fetch blog posts." }, { status: 500 });
  }
}
