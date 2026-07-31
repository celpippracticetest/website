import documentsClient from "@/lib/appDocumentsClient";
import { currentUser } from "@/lib/auth/server-auth";
import { NpsRepository } from "@/repositories/nps.repo";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const READINESS = new Set(["not_really", "somewhat", "a_lot_more"]);
const TRIGGERS = new Set(["mock_leave", "practice_milestone"]);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const trigger = String(body.trigger || "");
  if (!TRIGGERS.has(trigger)) {
    return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  }

  const readinessRaw = body.readiness;
  const readiness =
    readinessRaw == null || readinessRaw === ""
      ? null
      : String(readinessRaw);
  if (readiness && !READINESS.has(readiness)) {
    return NextResponse.json({ error: "Invalid readiness" }, { status: 400 });
  }

  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : null;
  const contextLabel =
    typeof body.contextLabel === "string"
      ? body.contextLabel.trim().slice(0, 200)
      : null;

  await new NpsRepository(documentsClient).create({
    userId: user.id,
    score,
    readiness: readiness as "not_really" | "somewhat" | "a_lot_more" | null,
    reason,
    trigger: trigger as "mock_leave" | "practice_milestone",
    contextLabel,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
