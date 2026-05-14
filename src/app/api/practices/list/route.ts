import { PracticeRepository } from "@/repositories/practice.repo";
import documentsClient from "@/lib/appDocumentsClient";
import { TExamType } from "@/models/enums";
import { NextRequest, NextResponse } from "next/server";

function optionalBoolFromQuery(v: string | null): boolean | undefined {
  if (v == null || String(v).trim() === "") return undefined;
  const t = String(v).trim().toLowerCase();
  if (t === "true" || t === "1" || t === "yes") return true;
  if (t === "false" || t === "0" || t === "no") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  const type: string | null = req.nextUrl.searchParams.get("type");
  const isFree: string | null = req.nextUrl.searchParams.get("isFree");
  const page: string = req.nextUrl.searchParams.get("page") ?? "0";
  const limit: string = req.nextUrl.searchParams.get("limit") ?? "10";

  const practiceRepo = new PracticeRepository(documentsClient);
  const practices = await practiceRepo.getAllPractice(
    {
      type: type?.toString().toUpperCase() as TExamType,
      isFree: optionalBoolFromQuery(isFree),
    },
    parseInt(page),
    parseInt(limit)
  );
  return NextResponse.json(
    { ...practices, items: practices.items.map((p) => p.name), filters: { type, isFree } },
    { status: 200 }
  );
}
