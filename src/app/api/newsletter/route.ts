import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "bson";
import { z } from "zod";
import documentsClient from "@/lib/appDocumentsClient";

const COLLECTION = "newsletterSubscribers";

const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Where the form lives, e.g. "blog:how-to-book-celpip-exam". */
  source: z.string().trim().max(160).optional(),
  /** Honeypot: real people never fill this hidden field. */
  company: z.string().optional(),
});

/** Best-effort per-instance throttle so one client can't spam the form. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isThrottled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Pretend success for bots so they don't retry.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  if (isThrottled(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const { email, source } = parsed.data;

  try {
    const collection = documentsClient.db().collection(COLLECTION);
    const existing = await collection.findOne({ email });
    if (!existing) {
      const now = new Date();
      await collection.insertOne({
        _id: new ObjectId(),
        email,
        source: source ?? null,
        status: "subscribed",
        createdAt: now,
        updatedAt: now,
      });
    }
    return NextResponse.json({ ok: true, alreadySubscribed: Boolean(existing) });
  } catch (error) {
    console.error("newsletter subscribe failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
