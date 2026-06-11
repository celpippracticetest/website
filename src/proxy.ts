import { NextResponse, type NextRequest } from "next/server";
import {
  readLegacyImportedExternalUserId,
  readPracticePlanFromSupabaseUser,
} from "@/lib/auth/supabase-user-plan";
import { repairAuthPlanIfProfileIsPlus } from "@/lib/auth/supabase-user-admin";
import { mobileUserBridgeFromSupabaseUser } from "@/lib/auth/supabase-mobile-user-bridge";
import { readBearerTokenFromRequest } from "@/lib/auth/request-auth";
import { appUserAdmin } from "@/lib/auth/app-user-admin";
import { logger, trackUserAction, captureException } from "@/lib/sentry-logger";
import { hasPaidPracticeAccess, normalizePlan } from "@/lib/subscriptionAccess";
import { PRICING_AB_COOKIE, type PricingAbLayout } from "@/lib/pricingAbTest";
import {
  PRICING_MODEL_AB_COOKIE,
  isPricingModelAbVariant,
  pickPricingModelAbVariant,
} from "@/lib/pricingModelAbTest";
import { HOME_AB_COOKIE, type HomeAbVariant } from "@/lib/homeAbTest";
import {
  UI_AB_COOKIE,
  UI_AB_COOKIE_MAX_AGE_SECONDS,
  UI_AB_HEADER,
  resolveUiAbMiddleware,
} from "@/lib/uiAbTest";
import { applyMarketingCookiesToResponse } from "@/lib/marketingCookies";
import {
  runAccountSharingMiddlewareCheck,
  shouldEnforceAccountSharingSignals,
} from "@/lib/accountSharingMiddleware";
import { refreshSupabaseSessionFromRequest } from "@/lib/supabase/middleware-session";
import { shouldSkipSupabaseSessionInMiddleware } from "@/lib/supabase/middleware-skip-paths";

const isAdminRoute = (req: NextRequest) => req.nextUrl.pathname.startsWith("/cms");

/** `publicMetadata.roles` is untyped; narrow before calling array methods. */
function metadataRolesIncludeAdmin(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const roles = metadata?.roles;
  return Array.isArray(roles) && roles.some((r) => r === "admin");
}
const isProfileRoute = (req: NextRequest) => req.nextUrl.pathname.startsWith("/profile");
const isReferralRoute = (req: NextRequest) => req.nextUrl.pathname.startsWith("/referral");
const isPlansRoute = (req: NextRequest) => req.nextUrl.pathname.startsWith("/plans");

const PRACTICE_HUB_PATHS = new Set([
  "/speaking",
  "/reading",
  "/writing",
  "/listening",
]);
const REFERRAL_CREATE_COOLDOWN_COOKIE = "referralCodeCreateCooldown";
const REFERRAL_CREATE_COOLDOWN_SECONDS = 60;

export default async function proxy(req: NextRequest) {
  let setReferralCreateCooldown = false;
  let clearPendingReferralCookie = false;

  const uiAb = resolveUiAbMiddleware(req);
  if (uiAb.stripQueryRedirect) {
    const redirect = NextResponse.redirect(uiAb.stripQueryRedirect);
    redirect.headers.set(UI_AB_HEADER, uiAb.variant);
    redirect.cookies.set(UI_AB_COOKIE, uiAb.variant, {
      path: "/",
      maxAge: UI_AB_COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return applyMarketingCookiesToResponse(req, redirect);
  }

  const { user: supabaseWebUser, cookieWrites: supabaseCookieWrites } =
    shouldSkipSupabaseSessionInMiddleware(req)
      ? { user: null, cookieWrites: [] }
      : await refreshSupabaseSessionFromRequest(req);
  const webStableId = supabaseWebUser
    ? readLegacyImportedExternalUserId(supabaseWebUser) ?? supabaseWebUser.id
    : null;
  const hasWebAuth = Boolean(supabaseWebUser);
  const sessionClaims = supabaseWebUser
    ? {
        metadata: mobileUserBridgeFromSupabaseUser(supabaseWebUser)
          .publicMetadata as Record<string, unknown>,
      }
    : null;

  const end = (response: NextResponse) => {
    response.headers.set(UI_AB_HEADER, uiAb.variant);
    if (uiAb.shouldSetCookie) {
      response.cookies.set(UI_AB_COOKIE, uiAb.variant, {
        path: "/",
        maxAge: UI_AB_COOKIE_MAX_AGE_SECONDS,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    for (const w of supabaseCookieWrites) {
      response.cookies.set(w.name, w.value, w.options);
    }
    return applyMarketingCookiesToResponse(req, response);
  };

  const practiceId = req.nextUrl.searchParams.get("selectedPracticeId");
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (practiceId && taskId) {
    const hubMatch = PRACTICE_HUB_PATHS.has(req.nextUrl.pathname);
    const slugMatch = /^\/(speaking|reading|writing|listening)(\/|$)/.test(
      req.nextUrl.pathname,
    );
    if (hubMatch || slugMatch) {
      const url = req.nextUrl.clone();
      const skill = req.nextUrl.pathname.split("/").filter(Boolean)[0];
      url.pathname = `/${skill}/${practiceId}/${taskId}`;
      url.search = "";
      return end(NextResponse.redirect(url, 301));
    }
  }

  const practiceMetaForSharing = supabaseWebUser
    ? readPracticePlanFromSupabaseUser(supabaseWebUser)
    : undefined;
  if (
    shouldEnforceAccountSharingSignals(
      req,
      webStableId,
      practiceMetaForSharing,
    )
  ) {
    const shareCheck = await runAccountSharingMiddlewareCheck(req);
    if (!shareCheck.ok) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return end(
          NextResponse.json(
            {
              message: shareCheck.reason,
              code: shareCheck.code ?? "ACCOUNT_SHARING_SUSPECTED",
              allowAddDevice: shareCheck.allowAddDevice,
              needsExtraDevices: shareCheck.needsExtraDevices,
              currentPlan: shareCheck.currentPlan,
              allowedDevices: shareCheck.allowedDevices,
              activeDevices: shareCheck.activeDevices,
            },
            { status: 403 },
          ),
        );
      }
      const notice = new URL("/account-sharing-notice", req.url);
      if (shareCheck.code) notice.searchParams.set("code", shareCheck.code);
      if (shareCheck.reason) notice.searchParams.set("message", shareCheck.reason);
      if (typeof shareCheck.allowAddDevice === "boolean") {
        notice.searchParams.set(
          "allowAddDevice",
          shareCheck.allowAddDevice ? "1" : "0",
        );
      }
      if (typeof shareCheck.needsExtraDevices === "number") {
        notice.searchParams.set("needsExtraDevices", String(shareCheck.needsExtraDevices));
      }
      if (typeof shareCheck.allowedDevices === "number") {
        notice.searchParams.set("allowedDevices", String(shareCheck.allowedDevices));
      }
      if (typeof shareCheck.activeDevices === "number") {
        notice.searchParams.set("activeDevices", String(shareCheck.activeDevices));
      }
      if (shareCheck.currentPlan) notice.searchParams.set("currentPlan", shareCheck.currentPlan);
      return end( NextResponse.redirect(notice));
    }
  }

  if (req.nextUrl.pathname === "/pricing") {
    const existing = req.cookies.get(PRICING_AB_COOKIE)?.value;
    /** Winner: two-card layout; migrate legacy `switch_toggle` assignment cookies. */
    const layout: PricingAbLayout = "two_card";
    if (existing !== layout) {
      const newReqHeaders = new Headers(req.headers);
      const currentCookies = newReqHeaders.get("cookie") || "";
      const cookieAddition = `${PRICING_AB_COOKIE}=${layout}`;
      const newCookies = currentCookies ? `${currentCookies}; ${cookieAddition}` : cookieAddition;
      newReqHeaders.set("cookie", newCookies);

      const response = NextResponse.next({
        request: {
          headers: newReqHeaders,
        },
      });

      response.cookies.set(PRICING_AB_COOKIE, layout, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax",
      });
      return end( response);
    }
  }

  if (req.nextUrl.pathname === "/") {
    const variant: HomeAbVariant = "passport";

    const newReqHeaders = new Headers(req.headers);
    newReqHeaders.set("x-home-ab-variant", variant);

    const response = NextResponse.next({
      request: {
        headers: newReqHeaders,
      },
    });

    const existing = req.cookies.get(HOME_AB_COOKIE)?.value;
    if (existing !== "passport") {
      response.cookies.set(HOME_AB_COOKIE, variant, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax",
      });
    }

    const refParam = req.nextUrl.searchParams.get("ref");
    const inviterParam = req.nextUrl.searchParams.get("inviter");
    if (refParam) {
      response.cookies.set("pendingReferralCode", refParam, {
        maxAge: 60 * 60,
        httpOnly: false,
        path: "/",
      });
    }
    if (inviterParam) {
      response.cookies.set("pendingInviterName", inviterParam, {
        maxAge: 60 * 60,
        httpOnly: false,
        path: "/",
      });
    }

    return end( response);
  }

  if (
    req.nextUrl.pathname.startsWith("/sign-up") ||
    req.nextUrl.pathname.startsWith("/sign-in")
  ) {
    const url = req.nextUrl.clone();
    const ref = url.searchParams.get("ref");
    const inviter = url.searchParams.get("inviter");

    if (ref || inviter) {
      const response = NextResponse.next();

      if (ref) {
        response.cookies.set("pendingReferralCode", ref, {
          maxAge: 60 * 60,
          httpOnly: false,
          path: "/",
        });
      }

      if (inviter) {
        response.cookies.set("pendingInviterName", inviter, {
          maxAge: 60 * 60,
          httpOnly: false,
          path: "/",
        });
      }

      return end( response);
    }
  }

  if (isProfileRoute(req)) {
    if (!hasWebAuth) {
      const dashboard = new URL("/practice-overview", req.url);
      return end(NextResponse.redirect(dashboard));
    }
    // All authenticated users can access their profile regardless of plan
  }
  if (isPlansRoute(req)) {
    if (!hasWebAuth) {
      const dashboard = new URL("/practice-overview", req.url);
      return end(NextResponse.redirect(dashboard));
    }
    let plan: string | undefined;
    let purchaseDate: string | undefined;
    if (supabaseWebUser) {
      const sp = readPracticePlanFromSupabaseUser(supabaseWebUser);
      plan = sp.plan;
      purchaseDate = sp.purchaseDate;
    }
    if (!hasPaidPracticeAccess(plan, purchaseDate)) {
      const homeUrl = new URL("/", req.url);
      return end(NextResponse.redirect(homeUrl));
    }
  }

  if (isReferralRoute(req)) {
    // Allow public access to referral page for non-authenticated users
    // They need to see the referral page to sign up
    if (!hasWebAuth) {
      // Don't redirect, allow access to referral page
      return end(NextResponse.next());
    }

    // For authenticated users, check plan
    let plan: string | undefined;
    let purchaseDate: string | undefined;
    if (supabaseWebUser) {
      const sp = readPracticePlanFromSupabaseUser(supabaseWebUser);
      plan = sp.plan;
      purchaseDate = sp.purchaseDate;
    }
    if (!hasPaidPracticeAccess(plan, purchaseDate)) {
      const homeUrl = new URL("/", req.url);
      return end(NextResponse.redirect(homeUrl));
    }
  }

  if (webStableId && !sessionClaims?.metadata.roles) {
    try {
      const client = await appUserAdmin();
      await client.users.updateUserMetadata(webStableId, {
        publicMetadata: {
          roles: ["user"],
        },
      });
    } catch (error) {
      captureException(error, {
        component: "middleware",
        action: "bootstrap_user_roles",
        userId: webStableId,
      });
    }
  }

  if (supabaseWebUser) {
    const app = (supabaseWebUser.app_metadata ?? {}) as Record<string, unknown>;
    if (normalizePlan(app.plan as string) !== "plus") {
      void repairAuthPlanIfProfileIsPlus(supabaseWebUser.id).catch(() => undefined);
    }
  }

  // Create referral code when user becomes premium
  const practiceMeta = supabaseWebUser
    ? readPracticePlanFromSupabaseUser(supabaseWebUser)
    : undefined;
  if (
    webStableId &&
    hasPaidPracticeAccess(practiceMeta?.plan, practiceMeta?.purchaseDate)
  ) {
    const hasReferralCode = (sessionClaims?.metadata as any)
      ?.referralCode;
    const onEligiblePage =
      req.method === "GET" &&
      (req.nextUrl.pathname === "/practice-overview" ||
        req.nextUrl.pathname === "/success" ||
        req.nextUrl.pathname === "/success/paypal");
    const hasCooldownCookie = Boolean(
      req.cookies.get(REFERRAL_CREATE_COOLDOWN_COOKIE)?.value,
    );

    if (!hasReferralCode && onEligiblePage && !hasCooldownCookie) {
      logger.info("User is premium but has no referral code, creating one", {
        component: "middleware",
        action: "create_referral_code",
        userId: webStableId,
      });
      setReferralCreateCooldown = true;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Forward cookies
        const incomingCookie = req.headers.get("cookie");
        if (incomingCookie) headers["cookie"] = incomingCookie;

        const response = await fetch(
          `${req.nextUrl.origin}/api/users/create-referral-code`,
          {
            method: "POST",
            headers,
          },
        );

        if (response.ok) {
          const data = await response.json();
          logger.info("Referral code created successfully", {
            component: "middleware",
            action: "referral_code_created",
            userId: webStableId,
            metadata: { code: data.code },
          });
        } else {
          const body = (await response.json().catch(() => ({}))) as {
            retryAfter?: number;
            error?: string;
          };
          logger.error("Failed to create referral code", {
            component: "middleware",
            action: "referral_code_creation_failed",
            userId: webStableId,
            metadata: {
              status: response.status,
              retryAfter: body.retryAfter,
              error: body.error,
            },
          });
        }
      } catch (error) {
        captureException(error, {
          component: "middleware",
          action: "referral_code_creation_error",
          userId: webStableId,
        });
      }
    }
  }

  // Update onboarding status when user visits practice-overview
  if (webStableId && req.nextUrl.pathname === "/practice-overview") {
    const hasCompletedOnboarding = (sessionClaims?.metadata as any)
      ?.onboardingCompleted;
    if (!hasCompletedOnboarding) {
      try {
      const client = await appUserAdmin();

      const referralCode = req.cookies.get("pendingReferralCode")?.value;

      if (referralCode) {
        let pendingKind: "partner" | "user_referral" | "none" = "none";
        try {
          const classifyHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const incomingCookie = req.headers.get("cookie");
          if (incomingCookie) classifyHeaders["cookie"] = incomingCookie;
          const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
          if (vercelBypass) {
            classifyHeaders["x-vercel-protection-bypass"] = vercelBypass;
          }

          const classifyRes = await fetch(
            `${req.nextUrl.origin}/api/partners/apply-pending-code`,
            {
              method: "POST",
              headers: classifyHeaders,
              body: JSON.stringify({ code: referralCode }),
            },
          );
          const classifyData = (await classifyRes.json().catch(() => ({}))) as {
            kind?: string;
          };
          if (
            classifyData.kind === "partner" ||
            classifyData.kind === "user_referral" ||
            classifyData.kind === "none"
          ) {
            pendingKind = classifyData.kind;
          }
        } catch (error) {
          captureException(error, {
            component: "middleware",
            action: "classify_pending_code_error",
            userId: webStableId,
          });
        }

        clearPendingReferralCookie = true;

        if (pendingKind === "partner") {
          logger.info("Partner attribution applied from pending cookie", {
            component: "middleware",
            action: "partner_attribution_from_cookie",
            userId: webStableId,
            metadata: { referralCode },
          });
        } else if (pendingKind === "user_referral") {
          logger.info("Referral code found in cookies", {
            component: "middleware",
            action: "referral_code_found",
            userId: webStableId,
            metadata: { referralCode },
          });
          await client.users.updateUserMetadata(webStableId, {
            publicMetadata: {
              onboardingCompleted: true,
              referralCode: referralCode,
              referralActive: true,
            },
          });

          logger.info("Processing referral discount", {
            component: "middleware",
            action: "process_referral_discount",
            userId: webStableId,
            metadata: { referralCode },
          });

          try {
            const discountResponse = await fetch(
              `${req.nextUrl.origin}/api/referrals/apply-discount`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  referralCode,
                  userId: webStableId,
                  userEmail:
                    supabaseWebUser?.email?.trim() ||
                    mobileUserBridgeFromSupabaseUser(supabaseWebUser!)
                      .primaryEmailAddress?.emailAddress ||
                    (sessionClaims as any)?.email_addresses?.[0]
                      ?.email_address,
                }),
              },
            );

            if (discountResponse.ok) {
              logger.info("Referral discount applied successfully", {
                component: "middleware",
                action: "referral_discount_applied",
                userId: webStableId,
                metadata: { referralCode },
              });
            } else {
              const errorData = await discountResponse.json();
              logger.error("Failed to apply referral discount", {
                component: "middleware",
                action: "referral_discount_failed",
                userId: webStableId,
                metadata: { referralCode, error: errorData },
              });
            }
          } catch (error) {
            captureException(error, {
              component: "middleware",
              action: "referral_discount_error",
              userId: webStableId,
              metadata: { referralCode },
            });
          }

          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            const incomingCookie = req.headers.get("cookie");
            if (incomingCookie) headers["cookie"] = incomingCookie;
            const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
            if (vercelBypass)
              headers["x-vercel-protection-bypass"] = vercelBypass as string;

            const response = await fetch(
              `${req.nextUrl.origin}/api/referrals/track-signup`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({ referralCode }),
              },
            );

            if (!response.ok) {
              const errorText = await response
                .text()
                .catch(() => "No error body");
              logger.error("Failed to track signup", {
                component: "middleware",
                action: "track_signup_failed",
                userId: webStableId,
                metadata: {
                  status: response.status,
                  statusText: response.statusText,
                  errorText,
                  referralCode,
                },
              });
            } else {
              let data: unknown = null;
              try {
                data = await response.json();
              } catch {}
              logger.info("Successfully tracked signup for referral code", {
                component: "middleware",
                action: "signup_tracked",
                userId: webStableId,
                metadata: { referralCode, data },
              });
            }
          } catch (error) {
            captureException(error, {
              component: "middleware",
              action: "track_signup_error",
              userId: webStableId,
              metadata: { referralCode },
            });
          }
        } else {
          await client.users.updateUserMetadata(webStableId, {
            publicMetadata: {
              onboardingCompleted: true,
            },
          });
        }
      } else {
        await client.users.updateUserMetadata(webStableId, {
          publicMetadata: {
            onboardingCompleted: true,
          },
        });
      }
      } catch (error) {
        captureException(error, {
          component: "middleware",
          action: "practice_overview_onboarding_bootstrap",
          userId: webStableId,
        });
      }
    }
  }

  if (isAdminRoute(req) && !metadataRolesIncludeAdmin(sessionClaims?.metadata)) {
    const url = new URL("/", req.url);
    return end( NextResponse.redirect(url));
  }

  const protectedPaths = [
    "POST:/api/practices",
    "POST:/api/tasks",
    "POST:/api/practices/answers",
    "GET:/api/practices/answers",
    "POST:/api/answers",
    "GET:/api/answers",
    "POST:/api/answers/writing",
    "GET:/api/answers/writing",
    "POST:/api/answers/speaking",
    "GET:/api/answers/speaking",
    "POST:/api/practice/mcq-feedback",
    "POST:/api/exams/answers",
    "GET:/api/exams/answers/writing",
    "POST:/api/exams/answers/writing",
    "GET:/api/exams/answers/speaking",
    "POST:/api/exams/answers/speaking",
    "POST:/api/checkout_session",
    "POST:/api/paypal/create-subscription",
  ];

  const requestedPath = `${req.method}:${req.nextUrl.pathname}`;
  if (protectedPaths.includes(requestedPath)) {
    const hasBearer = Boolean(readBearerTokenFromRequest(req));
    if (!supabaseWebUser && !hasBearer) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return end(
          NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        );
      }
      const signIn = new URL("/sign-in", req.url);
      return end(NextResponse.redirect(signIn));
    }
  }

  const response = end(NextResponse.next());
  if (setReferralCreateCooldown) {
    response.cookies.set(REFERRAL_CREATE_COOLDOWN_COOKIE, "1", {
      path: "/",
      maxAge: REFERRAL_CREATE_COOLDOWN_SECONDS,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  if (clearPendingReferralCookie) {
    response.cookies.set("pendingReferralCode", "", {
      path: "/",
      maxAge: 0,
    });
  }
  const existingPricingModel = req.cookies.get(PRICING_MODEL_AB_COOKIE)?.value;
  if (!isPricingModelAbVariant(existingPricingModel)) {
    response.cookies.set(PRICING_MODEL_AB_COOKIE, pickPricingModelAbVariant(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and non-image static assets. Do not skip raster/SVG image
    // extensions: a missing public file (e.g. /volume.png) would render through the App
    // Router and still hit this middleware.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest|manifest)).*)",
    "/api/users/webhook",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
