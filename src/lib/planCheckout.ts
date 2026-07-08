import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  buildSignUpUrlForCheckout,
  getSignedCheckoutSessionBase,
} from "@/lib/checkoutRequireAuth";

/** Legacy env product ids keyed by CMS `type` label. */
export function legacyCheckoutProductForPlanType(type: string): string {
  switch (type) {
    case "Easy Start":
    case "Monthly":
      return process.env.NEXT_PUBLIC_MONTHLY_ACCESS_PRODUCT ?? "";
    case "Weekly":
      return process.env.NEXT_PUBLIC_WEEKLY_ACCESS_PRODUCT ?? "";
    case "Best Seller":
    case "3-Month":
      return process.env.NEXT_PUBLIC_QUARTER_ACCESS_PRODUCT ?? "";
    case "Best Value":
    case "Yearly":
      return process.env.NEXT_PUBLIC_YEARLY_ACCESS_PRODUCT ?? "";
    default:
      return "";
  }
}

export function buildCheckoutSessionAction(args: {
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  legacyType?: string | null;
}): string | null {
  const priceId = args.stripePriceId?.trim();
  if (priceId) {
    return `/api/checkout_session?price=${encodeURIComponent(priceId)}`;
  }

  const productId =
    args.stripeProductId?.trim() ||
    (args.legacyType ? legacyCheckoutProductForPlanType(args.legacyType) : "");
  if (productId) {
    return `/api/checkout_session?product=${encodeURIComponent(productId)}`;
  }

  return null;
}

export function submitPlanCheckout(args: {
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  legacyType?: string | null;
  extraFields?: Record<string, string>;
  attributionFields?: Record<string, string>;
  isLoaded: boolean;
  isSignedIn: boolean;
}): boolean {
  if (!args.isLoaded) return false;

  if (!args.isSignedIn) {
    window.location.assign(buildSignUpUrlForCheckout());
    return true;
  }

  const checkoutBase = getSignedCheckoutSessionBase(args.isLoaded, args.isSignedIn);
  if (!checkoutBase) return false;

  const action = buildCheckoutSessionAction({
    stripePriceId: args.stripePriceId,
    stripeProductId: args.stripeProductId,
    legacyType: args.legacyType,
  });
  if (!action) return false;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;

  const add = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  for (const [key, value] of Object.entries(
    mergePendingGa4IntoAttribution(args.attributionFields ?? {}),
  )) {
    add(key, value);
  }
  if (args.extraFields) {
    for (const [key, value] of Object.entries(args.extraFields)) {
      if (value) add(key, value);
    }
  }

  document.body.appendChild(form);
  form.submit();
  return true;
}
