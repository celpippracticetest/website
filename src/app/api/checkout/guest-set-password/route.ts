import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
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

    const admin = await appUserAdmin();
    let users = await admin.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    let userId: string | null = null;
    if (users.data.length > 0) {
      userId = String(users.data[0].id);
    } else {
      try {
        const created = await admin.users.createUser({
          emailAddress: [email],
          skipPasswordRequirement: true,
        });
        userId = String(created.id);
      } catch (provisionErr: unknown) {
        const msg =
          provisionErr && typeof provisionErr === "object" && "message" in provisionErr
            ? String((provisionErr as Error).message)
            : "";
        if (/already been registered|already exists|duplicate/i.test(msg)) {
          for (let attempt = 0; attempt < 3; attempt++) {
            users = await admin.users.getUserList({
              emailAddress: [email],
              limit: 1,
            });
            if (users.data.length > 0) {
              userId = String(users.data[0].id);
              break;
            }
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
        if (!userId) {
          console.error("[guest-set-password] createUser failed", provisionErr);
          return NextResponse.json(
            {
              error:
                msg ||
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

    await admin.users.updateUser(userId, {
      password,
      ...(fn ? { firstName: fn } : {}),
      ...(ln ? { lastName: ln } : {}),
    });

    const origin = await getRequestOriginFromHeaders();
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set("redirect", "/practice-overview");
    signIn.searchParams.set("email", email);

    return NextResponse.json({ url: signIn.toString() }, { headers: { "Cache-Control": "no-store" } });
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
