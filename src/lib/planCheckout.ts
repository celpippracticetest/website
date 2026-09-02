import { trackEcommerce, trackKpi } from "@/lib/analytics";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  buildSignUpUrlForCheckout,
  getSignedCheckoutSessionBase,
} from "@/lib/checkoutRequireAuth";

function parsePlanPrice(raw?: string | null): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

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
  itemName?: string | null;
  itemPrice?: string | number | null;
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
  if (!action) {
    trackKpi.checkoutError({
      errorType: "missing_price_or_product",
      step: "submit_plan_checkout",
    });
    return false;
  }

  const itemId =
    args.stripePriceId?.trim() ||
    args.stripeProductId?.trim() ||
    args.legacyType ||
    "plan";
  const value =
    typeof args.itemPrice === "number"
      ? args.itemPrice
      : parsePlanPrice(args.itemPrice ?? null);
  const items = [
    {
      item_id: itemId,
      item_name: args.itemName || args.legacyType || "Subscription",
      price: value,
      quantity: 1,
      index: 0,
    },
  ];

  try {
    trackEcommerce.selectItem(items, "pricing_plans", "Pricing Plans");
    trackEcommerce.beginCheckout(items, "CAD", value);
  } catch {
    // never block checkout on analytics
  }

  if (notifyCelpipNativeIap(action)) {
    return true;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.setAttribute("action", action);

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
  if (args.stripePriceId?.trim()) add("price", args.stripePriceId.trim());
  if (args.stripeProductId?.trim()) add("product", args.stripeProductId.trim());

  document.body.appendChild(form);
  form.requestSubmit();
  return true;
}

function notifyCelpipNativeIap(action: string): boolean {
  if (typeof navigator === "undefined") return false;
  if (!/CELPIPApp\/|CelpipAppWebView/i.test(navigator.userAgent)) return false;
  const native = (
    window as Window & {
      CelpipNativeIap?: { postMessage: (message: string) => void };
    }
  ).CelpipNativeIap;
  if (!native?.postMessage) return false;
  native.postMessage(action);
  return true;
}
