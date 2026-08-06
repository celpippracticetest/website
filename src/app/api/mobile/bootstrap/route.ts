import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedRequestContext,
  readBearerTokenFromRequest,
} from "@/lib/auth/request-auth";
import { mobileUserBridgeFromSupabaseUser } from "@/lib/auth/supabase-mobile-user-bridge";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

type BootstrapUserRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: { stripeCustomerId?: string | null };
};

function jsonBootstrapPayload(authSource: string, user: BootstrapUserRow) {
  return {
    authSource,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName:
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null,
      imageUrl: user.imageUrl,
      primaryEmail:
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        null,
      publicMetadata: user.publicMetadata ?? {},
      privateMetadata: {
        stripeCustomerId:
          (user.privateMetadata?.stripeCustomerId as string | undefined) ?? null,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  const bearer = readBearerTokenFromRequest(request);
  const authContext = await getAuthenticatedRequestContext(request);

  if (authContext?.user) {
    const authSource =
      authContext.mobileAuthKind === "supabase"
        ? "mobile_supabase"
        : authContext.source;
    return NextResponse.json(
      jsonBootstrapPayload(authSource, authContext.user as BootstrapUserRow),
    );
  }

  if (!bearer) {
    return NextResponse.json(
      { error: "Unauthorized", code: "MISSING_AUTHORIZATION" },
      { status: 401 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED",
      },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized", code: "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED" },
      { status: 401 },
    );
  }

  const { data, error } = await admin.auth.getUser(bearer);
  if (error || !data.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: "SUPABASE_BEARER_REJECTED",
        ...(process.env.NODE_ENV === "development" && error?.message
          ? { debug: error.message }
          : {}),
      },
      { status: 401 },
    );
  }

  // Valid Supabase JWT but primary auth resolution failed — still return profile.
  const bridge = mobileUserBridgeFromSupabaseUser(data.user);
  return NextResponse.json(jsonBootstrapPayload("mobile_supabase", bridge));
}
