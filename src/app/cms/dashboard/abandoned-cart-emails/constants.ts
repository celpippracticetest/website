import {
  ABANDONED_CART_MERGE_TAG_HELP,
  ABANDONED_CART_MERGE_TAG_KEYS,
} from "@/lib/abandoned-cart-email/merge-fields";

export const MERGE_TAG_ROWS = ABANDONED_CART_MERGE_TAG_KEYS.map((key) => ({
  key,
  token: `{{${key}}}`,
  ...ABANDONED_CART_MERGE_TAG_HELP[key],
}));

export const SEQUENCE_DESCRIPTION =
  "Each step sends after checkout is abandoned, measured from the moment the user leaves without paying.";
