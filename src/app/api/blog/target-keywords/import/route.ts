import mongoClient from "@/lib/mongodb";
import { BlogTargetKeywordRepository } from "@/repositories/blog-target-keyword.repo";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_PHRASES_PER_REQUEST = 500;

const ImportBodySchema = z
  .object({
    text: z.string().optional(),
    phrases: z.array(z.string()).optional(),
    splitOnCommas: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (d) => Boolean((d.text != null && d.text.trim() !== "") || (d.phrases != null && d.phrases.length > 0)),
    { message: "Provide non-empty text or at least one phrase." },
  );

function phrasesFromText(text: string, splitOnCommas: boolean): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (splitOnCommas) {
      for (const part of line.split(",")) {
        const t = part.trim();
        if (t) out.push(t);
      }
    } else {
      out.push(line);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parser = ImportBodySchema.safeParse(body);
    if (!parser.success) {
      return NextResponse.json({ message: parser.error.flatten() }, { status: 400 });
    }

    const { text, phrases, splitOnCommas, isActive } = parser.data;
    const raw: string[] = [];
    if (text != null && text.trim() !== "") {
      raw.push(...phrasesFromText(text, splitOnCommas));
    }
    if (phrases != null && phrases.length > 0) {
      raw.push(...phrases);
    }

    if (raw.length > MAX_PHRASES_PER_REQUEST) {
      return NextResponse.json(
        {
          message: `Too many lines. Maximum is ${MAX_PHRASES_PER_REQUEST} per import.`,
        },
        { status: 400 },
      );
    }

    const repo = new BlogTargetKeywordRepository(mongoClient);
    const result = await repo.bulkImportPhrases(raw, { isActive: isActive ?? true });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to import blog target keywords:", error);
    return NextResponse.json({ message: "Failed to import keywords." }, { status: 500 });
  }
}
