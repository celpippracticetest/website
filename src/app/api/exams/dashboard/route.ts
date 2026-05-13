import { ExamRepository } from "@/repositories/exams.repo";
import { NextRequest, NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";

export const GET = async function (req: NextRequest) {
  // Parse query params
  const pageStr = req.nextUrl.searchParams.get("page") ?? "0";
  const limitStr = req.nextUrl.searchParams.get("limit") ?? "10";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const pageNum = parseInt(pageStr, 10);
  const limitNum = parseInt(limitStr, 10);

  // Build filter
  let filter: any = {};
  if (q) {
    filter.name = { $regex: q, $options: "i" };
  }

  const examRepo = new ExamRepository(documentsClient);
  const result: any = await examRepo.getAllExam(filter, pageNum, limitNum);

  // Normalize output to { items, total, page, limit }
  let items: any, total: any;
  if (Array.isArray(result)) {
    items = result;
    total = result.length;
  } else if (
    result &&
    typeof result === "object" &&
    ("items" in result || "total" in result)
  ) {
    items = result.items ?? [];
    total = result?.total ?? 0;
  } else {
    items = [];
    total = 0;
  }

  return NextResponse.json(
    {
      items,
      total,
      page: pageNum,
      limit: limitNum,
    },
    { status: 200 }
  );
};
