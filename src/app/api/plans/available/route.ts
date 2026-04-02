import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";


export async function GET() {
  try {
    const productIds = [
      process.env.NEXT_PUBLIC_WEEKLY_ACCESS_PRODUCT,
      process.env.NEXT_PUBLIC_MONTHLY_ACCESS_PRODUCT,
      process.env.NEXT_PUBLIC_QUARTER_ACCESS_PRODUCT,
      process.env.NEXT_PUBLIC_YEARLY_ACCESS_PRODUCT,
    ].filter(Boolean) as string[];

    const plans = await Promise.all(
      productIds.map(async (productId) => {
        try {
          const product = await stripe.products.retrieve(productId, {
            expand: ["default_price"],
          });

          const price = product.default_price as Stripe.Price;

          return {
            id: productId,
            name: product.name,
            priceId: price.id,
            amount: price.unit_amount ? price.unit_amount / 100 : 0,
            currency: price.currency,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
            metadata: product.metadata,
          };
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error);
          return null;
        }
      })
    );

    return NextResponse.json({
      plans: plans.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching available plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
