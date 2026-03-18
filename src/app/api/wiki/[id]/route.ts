import mongoClient from "@/lib/mongodb";
import { WikiArticleWriteSchema } from "@/models/wiki.model";
import { WikiRepository } from "@/repositories/wiki.repo";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json(
        { message: "Invalid wiki article id." },
        { status: 400 }
      );
    }

    const repo = new WikiRepository(mongoClient);
    const article = await repo.findById(id);

    if (!article) {
      return NextResponse.json(
        { message: "Wiki article not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(article, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch wiki article:", error);
    return NextResponse.json(
      { message: "Failed to fetch wiki article." },
      { status: 500 }
    );
  }
}

const updateSchema = WikiArticleWriteSchema.partial();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { message: "Invalid wiki article id." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parser = updateSchema.safeParse(body);
    if (!parser.success) {
      return NextResponse.json(
        { message: parser.error.flatten() },
        { status: 400 }
      );
    }

    const repo = new WikiRepository(mongoClient);
    const updated = await repo.updateById(id, parser.data);

    if (!updated) {
      return NextResponse.json(
        { message: "Wiki article not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Failed to update wiki article:", error);
    return NextResponse.json(
      { message: "Failed to update wiki article." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { message: "Invalid wiki article id." },
        { status: 400 }
      );
    }

    const repo = new WikiRepository(mongoClient);
    await repo.deleteById(id);

    return NextResponse.json(
      { message: "Wiki article deleted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete wiki article:", error);
    return NextResponse.json(
      { message: "Failed to delete wiki article." },
      { status: 500 }
    );
  }
}
