import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";

/** Fire a single KPI event via Measurement Protocol (server). */
export async function sendGa4KpiEvent(args: {
  clientId: string;
  userId?: string | null;
  gaSessionId?: string | null;
  name: string;
  params?: Record<string, unknown>;
}): Promise<void> {
  if (!args.clientId) return;
  void sendGa4Events({
    clientId: args.clientId,
    userId: args.userId,
    gaSessionId: args.gaSessionId,
    events: [{ name: args.name, params: args.params }],
  });
}

export function buildSubscriptionRenewEvent(params: {
  plan?: string;
  value?: number;
  currency?: string;
  subscriptionId?: string;
  termNumber?: number;
  extra?: Record<string, unknown>;
}) {
  return {
    name: "subscription_renew" as const,
    params: {
      plan: params.plan,
      term_number: params.termNumber ?? 1,
      value: params.value,
      currency: params.currency || "CAD",
      subscription_id: params.subscriptionId,
      ...(params.extra || {}),
    },
  };
}
