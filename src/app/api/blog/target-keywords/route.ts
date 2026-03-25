import mongoClient from "@/lib/mongodb";
import { BlogTargetKeywordWriteSchema } from "@/models/blog-target-keyword.model";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const repo = new BlogTargetKeywordRepository(mongoClient);
    const items = await repo.listAll();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Failed to list blog target keywords:", error);
    return NextResponse.json({ message: "Failed to load keywords." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parser = BlogTargetKeywordWriteSchema.safeParse(body);
    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    const repo = new BlogTargetKeywordRepository(mongoClient);
    const duplicate = await repo.findDuplicatePhrase(parser.data.phrase);
    if (duplicate) {
      return NextResponse.json(
        { message: "A keyword with the same text already exists." },
        { status: 409 },
      );
    }

    const created = await repo.create(parser.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create blog target keyword:", error);
    return NextResponse.json({ message: "Failed to create keyword." }, { status: 500 });
  }
}
