import { clerkClient } from "@clerk/express";
import { logger } from "@/lib/sentry-logger";

/**
 * Resolves an existing Clerk user by email, or creates a passwordless account
 * after Stripe guest checkout (Clerk sends verification / sign-in per instance settings).
 */
export async function findOrCreateClerkUserByEmail(rawEmail: string): Promise<string> {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Email required to provision account");
  }

  const existing = await clerkClient.users.getUserList({
    emailAddress: [normalized],
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  try {
    const created = await clerkClient.users.createUser({
      emailAddress: [normalized],
      skipPasswordRequirement: true,
      // Required when legal consent is enabled in Clerk.
      legalAcceptedAt: new Date(),
    });
    logger.info("Created Clerk user from guest Stripe checkout", {
      component: "clerk_guest_checkout",
      userId: created.id,
    });
    return created.id;
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "errors" in err && Array.isArray((err as any).errors)
        ? (err as any).errors[0]?.code
        : null;
    if (code === "form_identifier_exists" || code === "identifier_exists") {
      const retry = await clerkClient.users.getUserList({
        emailAddress: [normalized],
        limit: 1,
      });
      if (retry.data.length > 0) {
        return retry.data[0].id;
      }
    }
    throw err;
  }
}
