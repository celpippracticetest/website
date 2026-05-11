import mongoClient from "@/lib/mongodb";
import { BlogTargetKeywordWriteSchema } from "@/models/blog-target-keyword.model";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { ObjectId } from "bson";
import { NextRequest, NextResponse } from "next/server";

const partialWrite = BlogTargetKeywordWriteSchema.partial();

function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid keyword id." }, { status: 400 });
    }

    const body = await req.json();
    const parser = partialWrite.safeParse(body);
    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    if (Object.keys(parser.data).length === 0) {
      return NextResponse.json({ message: "No fields to update." }, { status: 400 });
    }

    const repo = new BlogTargetKeywordRepository(mongoClient);

    if (parser.data.phrase != null) {
      const duplicate = await repo.findDuplicatePhrase(parser.data.phrase, id);
      if (duplicate) {
        return NextResponse.json(
          { message: "A keyword with the same text already exists." },
          { status: 409 },
        );
      }
    }

    const updated = await repo.update(id, parser.data);
    if (!updated) {
      return NextResponse.json({ message: "Keyword not found." }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Failed to update blog target keyword:", error);
    return NextResponse.json({ message: "Failed to update keyword." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid keyword id." }, { status: 400 });
    }

    const repo = new BlogTargetKeywordRepository(mongoClient);
    const deleted = await repo.delete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Keyword not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Keyword deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete blog target keyword:", error);
    return NextResponse.json({ message: "Failed to delete keyword." }, { status: 500 });
  }
}
