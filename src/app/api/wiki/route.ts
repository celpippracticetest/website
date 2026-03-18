import mongoClient from "@/lib/mongodb";
import { WikiArticleWriteSchema } from "@/models/wiki.model";
import { WikiRepository } from "@/repositories/wiki.repo";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parser = WikiArticleWriteSchema.safeParse(body);

    if (!parser.success) {
      return NextResponse.json(
        { message: parser.error.flatten() },
        { status: 400 }
      );
    }

    const repo = new WikiRepository(mongoClient);
    const article = await repo.create(parser.data);

    return NextResponse.json({ id: article.id }, { status: 200 });
  } catch (error) {
    console.error("Failed to create wiki article:", error);
    return NextResponse.json(
      { message: "Failed to create wiki article." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const repo = new WikiRepository(mongoClient);
    const items = await repo.findAll();
    return NextResponse.json({
      items,
      totalItems: items.length,
    });
  } catch (error) {
    console.error("Failed to fetch wiki articles:", error);
    return NextResponse.json(
      { message: "Failed to fetch wiki articles." },
      { status: 500 }
    );
  }
}
