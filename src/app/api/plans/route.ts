import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        const db = await getDb();
        const plansCollection = db.collection("plans");

        // Check if plans exist, if not seed them
        const count = await plansCollection.countDocuments();
        if (count === 0) {
            const defaultPlans = [
                {
                    title: "Premium 3-Month",
                    type: "Best Seller",
                    planTitle: "3 Months",
                    oldPrice: "240.99",
                    price: "89.99",
                    discount: "70",
                    buttonTitle: "Save Now",
                    features: [
                        "Full access to all premium features",
                        "Valid for 3 months",
                        "Ideal for test-takers with a set deadline",
                        "Includes all mock exams and practice",
                    ],
                    iconType: "BestValuePlan",
                    iconWrapperColor: "bg-secondary5",
                    isActive: true,
                    order: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: "Premium Monthly",
                    type: "Easy Start",
                    planTitle: "Monthly",
                    oldPrice: "80.00",
                    price: "44.99",
                    discount: "40",
                    buttonTitle: "Go Premium",
                    features: [
                        "Unlimited access to 3,000+ practices",
                        "60 full mock exams",
                        "Instant AI feedback for all skills",
                        "Progress tracking and insights",
                    ],
                    iconType: "PopularPlan",
                    iconWrapperColor: "bg-purple5",
                    isActive: true,
                    order: 2,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: "Weekly",
                    type: "Weekly",
                    planTitle: "Weekly",
                    oldPrice: "25.00",
                    price: "17.99",
                    discount: "30",
                    buttonTitle: "Go Premium",
                    features: [
                        "Unlimited access to 3,000+ practices",
                        "60 full mock exams",
                        "Instant AI feedback for all skills",
                        "Progress tracking and insights",
                    ],
                    iconType: "FreePlan",
                    iconWrapperColor: "bg-[#D1DEFF]",
                    isActive: true,
                    order: 3,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            await plansCollection.insertMany(defaultPlans);
        }

        const plans = await plansCollection
            .find({ isActive: true })
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
