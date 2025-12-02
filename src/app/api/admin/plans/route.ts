import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Plan } from "@/models/plans.model";
import { auth } from "@clerk/nextjs/server";

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
            stripePriceId,
            iconType,
            iconWrapperColor,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

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
        const result = await db.collection("plans").updateOne(
            { _id: new ObjectId(_id) },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
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
