import { NextRequest, NextResponse } from "next/server";

import { resolvePromotionCodeByCustomerCode } from "@/lib/stripePromotionCode";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: string };
    const code = typeof body.code === "string" ? body.code : "";
    const result = await resolvePromotionCodeByCustomerCode(code);

    if ("error" in result) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      promotionCodeId: result.promotionCodeId,
      discountLabel: result.discountLabel,
      percentOff: result.discount.percentOff,
      amountOff: result.discount.amountOff,
      currency: result.discount.currency,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Could not validate promo code" },
      { status: 500 },
    );
  }
}
