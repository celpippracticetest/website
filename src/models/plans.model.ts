import { ObjectId } from "bson";

export type PlanBillingInterval = "day" | "week" | "month" | "year";

export interface Plan {
    _id?: ObjectId;
    title: string;        // e.g., "Premium 3-Month"
    type: string;         // e.g., "Best Seller"
    planTitle: string;    // e.g., "3 Months"
    oldPrice: string;     // e.g., "240.99"
    price: string;        // e.g., "89.99"
    discount: string;     // e.g., "70"
    buttonTitle: string;  // e.g., "Save Now"
    features: string[];   // List of features
    billingInterval?: PlanBillingInterval; // Stripe recurring interval
    billingIntervalCount?: number; // Stripe recurring interval count
    stripeProductId?: string; // Optional: Linked Stripe Product ID
    stripePriceId?: string; // Optional: Link to Stripe Price ID
    /** PayPal Subscriptions billing plan id (created in CMS or dashboard). */
    paypalPlanId?: string;
    /** PayPal catalog product id (optional; set when creating plan via CMS). */
    paypalProductId?: string;
    iconType?: "BestValuePlan" | "PopularPlan" | "FreePlan"; // To map to icons in frontend
    iconWrapperColor?: string; // e.g., "bg-secondary5"
    isActive: boolean;    // To show/hide plans
    order: number;        // For sorting
    createdAt: Date;
    updatedAt: Date;
}
