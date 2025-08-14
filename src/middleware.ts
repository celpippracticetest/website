import { NextResponse, type NextRequest } from "next/server";
import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/cms(.*)"]);
const isProfileRoute = createRouteMatcher(["/profile(.*)"]);
const isReferralRoute = createRouteMatcher(["/referral(.*)"]);
const isPlansRoute = createRouteMatcher(["/plans(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authenticate = await auth();
  if (isProfileRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return NextResponse.redirect(dashboard);
    }
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "free" && plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  if (isPlansRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return NextResponse.redirect(dashboard);
    }
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  if (isReferralRoute(req)) {
    if (!authenticate.userId) {
      const dashboard = new URL("/practice-overview", req.url);
      return NextResponse.redirect(dashboard);
    }
    const plan = authenticate.sessionClaims?.metadata.plan;
    if (plan !== "premium") {
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  if (authenticate.userId && !authenticate.sessionClaims?.metadata.roles) {
    const client = await clerkClient();
    client.users.updateUserMetadata(authenticate.userId, {
      publicMetadata: {
        roles: ["user"],
        plan: "free",
      },
    });
  }

  if (
    isAdminRoute(req) &&
    (!authenticate.sessionClaims?.metadata.roles ||
      !authenticate.sessionClaims?.metadata?.roles?.includes("admin"))
  ) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  const protectedPaths = [
    "POST:/api/practices",
    "POST:/api/tasks",
    "POST:/api/practices/answers",
    "GET:/api/practices/answers",
    "POST:/api/answers",
    "POST:/api/answers/writing",
    "GET:/api/answers/writing",
    "POST:/api/answers/speaking",
    "POST:/api/checkout_session",
  ];

  const requestedPath = `${req.method}:${req.nextUrl.pathname}`;
  if (protectedPaths.includes(requestedPath)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/users/webhook",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
