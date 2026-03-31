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
    let users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    let userId: string | null = null;
    if (users.data.length > 0) {
      userId = users.data[0].id;
    } else {
      // Webhook / success-page provisioning can lag behind the UI; create the
      // same passwordless Clerk user here (idempotent with webhook).
      // Important: use the same Clerk client instance as the rest of this route.
      try {
        const created = await clerk.users.createUser({
          emailAddress: [email],
          skipPasswordRequirement: true,
          // Required when legal consent is enabled in Clerk.
          legalAcceptedAt: new Date(),
        });
        userId = created.id;
      } catch (provisionErr: any) {
        const code =
          provisionErr &&
          typeof provisionErr === "object" &&
          "errors" in provisionErr &&
          Array.isArray((provisionErr as any).errors)
            ? (provisionErr as any).errors[0]?.code
            : null;

        const provisionMsg =
          provisionErr &&
          typeof provisionErr === "object" &&
          "errors" in provisionErr &&
          Array.isArray((provisionErr as any).errors) &&
          (provisionErr as any).errors[0]?.message
            ? (provisionErr as any).errors[0].message
            : null;

        const provisionLongMsg =
          provisionErr &&
          typeof provisionErr === "object" &&
          "errors" in provisionErr &&
          Array.isArray((provisionErr as any).errors) &&
          (provisionErr as any).errors[0]?.longMessage
            ? (provisionErr as any).errors[0].longMessage
            : null;

        // If another request created it first, fetch again and continue.
        if (code === "form_identifier_exists" || code === "identifier_exists") {
          // Clerk writes can be slightly delayed; retry a couple times.
          for (let attempt = 0; attempt < 3; attempt++) {
            users = await clerk.users.getUserList({
              emailAddress: [email],
              limit: 1,
            });
            if (users.data.length > 0) {
              userId = users.data[0].id;
              break;
            }
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }

          if (!userId) throw provisionErr;
        } else {
          console.error("[guest-set-password] createUser failed", provisionErr);
          return NextResponse.json(
            {
              error:
                provisionLongMsg ||
                provisionMsg ||
                code ||
                (provisionErr &&
                typeof provisionErr === "object" &&
                "message" in provisionErr
                  ? (provisionErr as any).message
                  : null) ||
                "We could not finish creating your account. Please try again in a few seconds.",
            },
            { status: 503 }
          );
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "We could not finish creating your account. Please try again in a few seconds.",
        },
        { status: 503 }
      );
    }
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
