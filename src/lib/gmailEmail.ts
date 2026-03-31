/**
 * Consumer Gmail domains only (not Google Workspace).
 * Used to gate "Continue with Google" after guest checkout when email must match Stripe.
 */
export function isConsumerGmailEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const at = email.trim().toLowerCase().split("@");
  if (at.length !== 2) return false;
  const domain = at[1];
  return domain === "gmail.com" || domain === "googlemail.com";
}
