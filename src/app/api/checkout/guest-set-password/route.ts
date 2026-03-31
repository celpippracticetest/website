import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getRequestOriginFromHeaders } from "@/lib/requestOrigin";

function isGuestCheckoutSessionId(id: string): boolean {
  return typeof id === "string" && id.startsWith("cs_");
}

type Body = {
  sessionId?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!sessionId || !isGuestCheckoutSessionId(sessionId) || !password) {
    return NextResponse.json(
      { error: "Session and password are required" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const guest =
      String(session.metadata?.guest_checkout ?? "").toLowerCase() === "true";
    if (!guest || session.status !== "complete") {
      return NextResponse.json({ error: "Invalid or incomplete checkout" }, { status: 400 });
    }
    const email =
      session.customer_details?.email?.trim().toLowerCase() ||
      (typeof session.customer_email === "string"
        ? session.customer_email.trim().toLowerCase()
        : "");
    if (!email) {
      return NextResponse.json({ error: "No email on checkout" }, { status: 400 });
    }

    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    if (users.data.length === 0) {
      return NextResponse.json(
        {
          error:
            "Your account is still being set up. Please wait a few seconds and try again.",
        },
        { status: 409 }
      );
    }

    const userId = users.data[0].id;
    const fn = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const ln = typeof body.lastName === "string" ? body.lastName.trim() : "";

    await clerk.users.updateUser(userId, {
      password,
      ...(fn ? { firstName: fn } : {}),
      ...(ln ? { lastName: ln } : {}),
    });

    const signIn = await clerk.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 900,
    });
    if (!signIn?.url) {
      return NextResponse.json({ error: "Could not create sign-in link" }, { status: 500 });
    }

    const origin = await getRequestOriginFromHeaders();
    const url = new URL(signIn.url);
    url.searchParams.set("redirect_url", `${origin}/practice-overview`);

    return NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    console.error("[guest-set-password]", e);
    const msg =
      e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: { message?: string }[] }).errors)
        ? (e as { errors: { message?: string }[] }).errors[0]?.message
        : null;
    return NextResponse.json(
      { error: msg || "Could not set password. Try a stronger password." },
      { status: 400 }
    );
  }
}
