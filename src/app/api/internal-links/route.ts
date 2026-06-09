import { NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const links = await db.collection("internalLinks").find().toArray();

    const formattedLinks = links.map(link => ({
      keyword: link.keyword,
      url: link.url,
      exactMatch: link.exactMatch || false
    }));

    return NextResponse.json(formattedLinks);
  } catch (error) {
    console.error("Failed to fetch internal links:", error);
    return NextResponse.json([], { status: 500 });
  }
}
