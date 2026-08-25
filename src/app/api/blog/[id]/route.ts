import documentsClient from "@/lib/appDocumentsClient";
import { BlogWriteSchema } from "@/models/blog.model";
import { BlogRepository } from "@/repositories/blog.repo";
import { revalidateBlogPages } from "@/lib/blog/revalidate";
import { ObjectId } from "bson";
import { NextRequest, NextResponse } from "next/server";

const updateSchema = BlogWriteSchema.partial();

function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid blog id." }, { status: 400 });
    }

    const repo = new BlogRepository(documentsClient);
    const blog = await repo.findBlogById(id);

    if (!blog) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    return NextResponse.json(blog, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
    return NextResponse.json({ message: "Failed to fetch blog post." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid blog id." }, { status: 400 });
    }

    const body = await req.json();
    const parser = updateSchema.safeParse(body);
    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    const repo = new BlogRepository(documentsClient);
    const current = await repo.findBlogById(id);
    const updated = await repo.updateBlog(id, parser.data);

    if (!updated) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    if (current?.slug && current.slug !== updated.slug) {
      revalidateBlogPages(current.slug);
    }
    revalidateBlogPages(updated.slug);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Failed to update blog post:", error);
    return NextResponse.json({ message: "Failed to update blog post." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid blog id." }, { status: 400 });
    }

    const repo = new BlogRepository(documentsClient);
    const current = await repo.findBlogById(id);
    await repo.deleteBlog(id);
    revalidateBlogPages(current?.slug);

    return NextResponse.json({ message: "Blog post deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete blog post:", error);
    return NextResponse.json({ message: "Failed to delete blog post." }, { status: 500 });
  }
}
