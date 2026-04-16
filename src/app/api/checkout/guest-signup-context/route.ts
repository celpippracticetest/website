import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

function isGuestCheckoutSessionId(id: string): boolean {
  return typeof id === "string" && id.startsWith("cs_");
}

/**
 * Returns the payer email for a completed guest checkout so the sign-up UI can lock the field.
 * Does not expose data for non-guest or incomplete sessions.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId || !isGuestCheckoutSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
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

    const amountTotalCents = Math.max(0, Number(session.amount_total || 0));
    const currency = String(session.currency || "cad").toUpperCase();
    const items = (session.line_items?.data || []).map((item) => ({
      id: item.id,
      description: item.description || "CELPIP Plan",
      amount_total: Number(item.amount_total || 0),
      quantity: Number(item.quantity || 1),
      price: {
        product:
          typeof item.price?.product === "string"
            ? item.price.product
            : undefined,
      },
    }));

    return NextResponse.json(
      { email, sessionId, amountTotalCents, currency, items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[guest-signup-context]", e);
    return NextResponse.json({ error: "Could not load checkout" }, { status: 500 });
  }
}
