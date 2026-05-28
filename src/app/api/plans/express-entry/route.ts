import { NextResponse } from "next/server";
import { getActivePlansCatalog } from "@/lib/plansCatalog";

/** Plus plans with amounts from Stripe — same catalog as `/pricing`. */
export async function GET() {
  try {
    const plans = await getActivePlansCatalog();
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("express-entry plans:", err);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
