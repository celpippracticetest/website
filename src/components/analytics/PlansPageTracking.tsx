"use client";

import { useEffect } from "react";
import { useEcommerceTracking } from "@/hooks/useTracking";

interface Plan {
  title: string;
  type: string;
  price: string;
  planTitle: string;
}

interface PlansPageTrackingProps {
  plans: Plan[];
}

/**
 * PlansPageTracking Component
 * Tracks view_item_list event when plans page is viewed
 */
export default function PlansPageTracking({ plans }: PlansPageTrackingProps) {
  const { viewItemList } = useEcommerceTracking();

  useEffect(() => {
    // Format items for GA4 e-commerce
    const items = plans.map((plan) => ({
      item_id: plan.planTitle,
      item_name: plan.title,
      price: parseFloat(plan.price),
      quantity: 1,
      item_brand: 'CELPIP Practice Test',
      item_category: 'Subscription',
    }));

    // Track view_item_list event
    viewItemList(items, 'plans_page', 'Pricing Plans');

    if (process.env.NODE_ENV === 'development') {
      console.log('[E-commerce] Plans viewed:', items);
    }
  }, [plans, viewItemList]);

  return null;
}
