import { NextResponse } from "next/server";
import { getPublishedProfessionPageSummaries } from "@/lib/profession-pages/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getPublishedProfessionPageSummaries();
    return NextResponse.json(
      {
        items,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("[profession-pages] GET failed:", error);
    return NextResponse.json(
      { message: "Failed to load profession pages." },
      { status: 500 }
    );
  }
}
