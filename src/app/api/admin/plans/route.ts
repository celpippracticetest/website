import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Plan } from "@/models/plans.model";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getPlanRecurringConfig, parseBillingIntervalCount } from "@/lib/planBilling";

function parsePriceToCents(value: string | number | undefined) {
    const numericValue = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
    return Math.round(numericValue * 100);
}

function buildStripeProductName(plan: Pick<Plan, "title" | "planTitle">) {
    return plan.title?.trim() || plan.planTitle?.trim() || "CELPIP Practice Plan";
}

function buildStripeProductMetadata(plan: Partial<Plan>) {
    const recurring = getPlanRecurringConfig({
        title: plan.title || "",
        planTitle: plan.planTitle || "",
        type: plan.type || "",
        billingInterval: plan.billingInterval,
        billingIntervalCount: plan.billingIntervalCount,
    });

    return {
        cms_plan_title: plan.title || "",
        cms_plan_badge: plan.type || "",
        cms_plan_duration: plan.planTitle || "",
        cms_billing_interval: recurring.interval,
        cms_billing_interval_count: String(recurring.interval_count),
    };
}

async function createStripeAssetsForPlan(plan: Plan) {
    const unitAmount = parsePriceToCents(plan.price);
    if (!unitAmount) {
        return { stripeProductId: plan.stripeProductId, stripePriceId: plan.stripePriceId };
    }

    const recurring = getPlanRecurringConfig(plan);
    const product = await stripe.products.create({
        name: buildStripeProductName(plan),
        active: plan.isActive,
        metadata: buildStripeProductMetadata(plan),
    });

    const price = await stripe.prices.create({
        currency: "cad",
        unit_amount: unitAmount,
        recurring,
        product: product.id,
        metadata: buildStripeProductMetadata(plan),
    });

    await stripe.products.update(product.id, {
        default_price: price.id,
    });

    return { stripeProductId: product.id, stripePriceId: price.id };
}

async function syncStripeAssetsForPlan(existingPlan: Plan, nextPlan: Plan) {
    const unitAmount = parsePriceToCents(nextPlan.price);
    if (!unitAmount) {
        return {
            stripeProductId: nextPlan.stripeProductId || existingPlan.stripeProductId,
            stripePriceId: nextPlan.stripePriceId || existingPlan.stripePriceId,
        };
    }

    const explicitPriceId = nextPlan.stripePriceId?.trim();
    const explicitPriceChanged =
        !!explicitPriceId && explicitPriceId !== (existingPlan.stripePriceId || "").trim();
    const explicitProductChanged =
        !!nextPlan.stripeProductId?.trim() &&
        nextPlan.stripeProductId.trim() !== (existingPlan.stripeProductId || "").trim();

    if (explicitPriceChanged || explicitProductChanged) {
        let explicitProductId = nextPlan.stripeProductId?.trim();
        const resolvedPriceId = explicitPriceId || existingPlan.stripePriceId?.trim();
        if (!explicitProductId) {
            const explicitPrice = await stripe.prices.retrieve(resolvedPriceId!);
            explicitProductId =
                typeof explicitPrice.product === "string"
                    ? explicitPrice.product
                    : explicitPrice.product.id;
        }

        return {
            stripeProductId: explicitProductId,
            stripePriceId: resolvedPriceId,
        };
    }

    let stripeProductId = nextPlan.stripeProductId || existingPlan.stripeProductId;
    let stripePriceId = existingPlan.stripePriceId;

    if (!stripeProductId && stripePriceId) {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        stripeProductId =
            typeof existingPrice.product === "string"
                ? existingPrice.product
                : existingPrice.product.id;
    }

    if (!stripeProductId) {
        return createStripeAssetsForPlan(nextPlan);
    }

    await stripe.products.update(stripeProductId, {
        name: buildStripeProductName(nextPlan),
        active: nextPlan.isActive,
        metadata: buildStripeProductMetadata(nextPlan),
    });

    const recurring = getPlanRecurringConfig(nextPlan);
    let needsNewPrice = !stripePriceId;

    if (stripePriceId) {
        const currentPrice = await stripe.prices.retrieve(stripePriceId);
        const currentInterval = currentPrice.recurring?.interval || null;
        const currentIntervalCount = currentPrice.recurring?.interval_count || null;
        const currentAmount = currentPrice.unit_amount || 0;

        if (
            currentAmount !== unitAmount ||
            currentInterval !== recurring.interval ||
            currentIntervalCount !== recurring.interval_count
        ) {
            needsNewPrice = true;
        }
    }

    if (needsNewPrice) {
        const newPrice = await stripe.prices.create({
            currency: "cad",
            unit_amount: unitAmount,
            recurring,
            product: stripeProductId,
            metadata: buildStripeProductMetadata(nextPlan),
        });

        await stripe.products.update(stripeProductId, {
            default_price: newPrice.id,
        });

        stripePriceId = newPrice.id;
    }

    return { stripeProductId, stripePriceId };
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // TODO: Add admin check here if needed, for now assuming access to admin route implies admin

        const db = await getDb();
        const plans = await db
            .collection("plans")
            .find({})
            .sort({ order: 1 })
            .toArray();

        return NextResponse.json({ plans });
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            title,
            type,
            planTitle,
            oldPrice,
            price,
            discount,
            buttonTitle,
            features,
            billingInterval,
            billingIntervalCount,
            stripeProductId,
            stripePriceId,
            iconType,
            iconWrapperColor,
            isActive,
            order,
        } = body;

        const newPlan: Plan = {
            title,
            type,
            planTitle,
            oldPrice,
            price,
            discount,
            buttonTitle,
            features: features || [],
            billingInterval,
            billingIntervalCount: parseBillingIntervalCount(billingIntervalCount, 1),
            stripeProductId,
            stripePriceId,
            iconType,
            iconWrapperColor,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const recurring = getPlanRecurringConfig(newPlan);
        newPlan.billingInterval = recurring.interval;
        newPlan.billingIntervalCount = recurring.interval_count;

        if (newPlan.stripePriceId?.trim() && !newPlan.stripeProductId?.trim()) {
            const existingPrice = await stripe.prices.retrieve(newPlan.stripePriceId.trim());
            newPlan.stripeProductId =
                typeof existingPrice.product === "string"
                    ? existingPrice.product
                    : existingPrice.product.id;
        } else if (!newPlan.stripePriceId?.trim()) {
            const stripeAssets = await createStripeAssetsForPlan(newPlan);
            newPlan.stripeProductId = stripeAssets.stripeProductId;
            newPlan.stripePriceId = stripeAssets.stripePriceId;
        }

        const db = await getDb();
        const result = await db.collection("plans").insertOne(newPlan);

        return NextResponse.json({
            success: true,
            plan: { ...newPlan, _id: result.insertedId },
        });
    } catch (error) {
        console.error("Error creating plan:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json(
                { error: "Plan ID is required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const existingPlan = await db.collection("plans").findOne<Plan>({
            _id: new ObjectId(_id),
        });

        if (!existingPlan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        const mergedPlan: Plan = {
            ...existingPlan,
            ...updateData,
            _id: existingPlan._id,
            updatedAt: new Date(),
        };

        const recurring = getPlanRecurringConfig(mergedPlan);
        mergedPlan.billingInterval = recurring.interval;
        mergedPlan.billingIntervalCount = recurring.interval_count;

        const stripeAssets = await syncStripeAssetsForPlan(existingPlan, mergedPlan);
        mergedPlan.stripeProductId = stripeAssets.stripeProductId;
        mergedPlan.stripePriceId = stripeAssets.stripePriceId;
        const { _id: _ignoredId, ...planFieldsToSet } = mergedPlan;

        const result = await db.collection("plans").updateOne(
            { _id: new ObjectId(_id) },
            {
                $set: {
                    ...planFieldsToSet,
                },
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating plan:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Plan ID is required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const result = await db.collection("plans").deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting plan:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
