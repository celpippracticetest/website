import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { getDb } from "@/lib/appDocumentsClient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ACQUISITION_ATTRIBUTION_COOKIE,
  mergeAcquisitionCookieIntoAttributionData,
} from "@/lib/attributionCookie";
import {
  matchUsersCollectionByWebUserIds,
  supabaseAuthUserIdFieldsOnUserDoc,
} from "@/lib/users/userDocumentIdentity";

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(req);
    const userId = authContext?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      gclid,
      gbraid,
      wbraid,
      google_ads_campaign_id,
      fbclid,
      msclkid,
      ttclid,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      entryPage,
      referrer,
      sessionId,
      country,
      currency,
    } = body;

    // Filter out undefined/null values
    const attributionData: Record<string, string> = {};
    if (gclid) attributionData.gclid = gclid;
    if (gbraid) attributionData.gbraid = gbraid;
    if (wbraid) attributionData.wbraid = wbraid;
    if (google_ads_campaign_id) attributionData.google_ads_campaign_id = google_ads_campaign_id;
    if (fbclid) attributionData.fbclid = fbclid;
    if (msclkid) attributionData.msclkid = msclkid;
    if (ttclid) attributionData.ttclid = ttclid;
    if (utm_source) attributionData.utm_source = utm_source;
    if (utm_medium) attributionData.utm_medium = utm_medium;
    if (utm_campaign) attributionData.utm_campaign = utm_campaign;
    if (utm_content) attributionData.utm_content = utm_content;
    if (utm_term) attributionData.utm_term = utm_term;
    if (entryPage) attributionData.entryPage = entryPage;
    if (country) attributionData.country = country;
    if (currency) attributionData.currency = currency;

    mergeAcquisitionCookieIntoAttributionData(
      req.cookies.get(ACQUISITION_ATTRIBUTION_COOKIE)?.value,
      attributionData
    );

    if (Object.keys(attributionData).length === 0) {
      return NextResponse.json({ message: "No attribution data provided" });
    }

    const nowIso = new Date().toISOString();
    const inferSourceFromReferrer = (): string => {
      if (!referrer) return "direct";
      try {
        const host = new URL(referrer).hostname.toLowerCase();
        if (host.includes("google.")) return "google_organic";
        if (host.includes("bing.")) return "bing_organic";
        if (host.includes("facebook.") || host.includes("instagram.")) return "meta_organic";
        if (host.includes("tiktok.")) return "tiktok_organic";
      } catch {
        return "referral";
      }
      return "referral";
    };
    const source =
      attributionData.utm_source ||
      (attributionData.gclid || attributionData.gbraid || attributionData.wbraid
        ? "google"
        : attributionData.msclkid
          ? "bing"
          : attributionData.fbclid
            ? "facebook"
            : attributionData.ttclid
              ? "tiktok"
              : inferSourceFromReferrer());
    const medium =
      attributionData.utm_medium ||
      (attributionData.gclid ||
      attributionData.gbraid ||
      attributionData.wbraid ||
      attributionData.msclkid ||
      attributionData.fbclid ||
      attributionData.ttclid
        ? "cpc"
        : referrer
          ? "referral"
          : "(none)");
    const campaign =
      attributionData.utm_campaign ||
      attributionData.google_ads_campaign_id ||
      "(not set)";
    const content = attributionData.utm_content || null;
    const term = attributionData.utm_term || null;
    const resolvedEntryPage = attributionData.entryPage || null;
    const resolvedCountry = attributionData.country || null;
    const resolvedCurrency = attributionData.currency || null;

    const supabaseUuid = authContext.supabaseAuthUserId;
    const isSupabaseBacked = supabaseUuid != null;

    if (isSupabaseBacked) {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data: existingAuth, error: getErr } = await admin.auth.admin.getUserById(
          supabaseUuid
        );
        if (!getErr && existingAuth.user) {
          const currentUserMeta = (existingAuth.user.user_metadata ?? {}) as Record<
            string,
            unknown
          >;
          await admin.auth.admin.updateUserById(supabaseUuid, {
            user_metadata: {
              ...currentUserMeta,
              ...(attributionData.utm_source && { utm_source: attributionData.utm_source }),
              ...(attributionData.utm_medium && { utm_medium: attributionData.utm_medium }),
              ...(attributionData.utm_campaign && { utm_campaign: attributionData.utm_campaign }),
              ...(attributionData.utm_content && { utm_content: attributionData.utm_content }),
              ...(attributionData.utm_term && { utm_term: attributionData.utm_term }),
              ...(attributionData.gclid && { gclid: attributionData.gclid }),
              ...(attributionData.gbraid && { gbraid: attributionData.gbraid }),
              ...(attributionData.wbraid && { wbraid: attributionData.wbraid }),
              ...(attributionData.google_ads_campaign_id && {
                google_ads_campaign_id: attributionData.google_ads_campaign_id,
              }),
              ...(attributionData.fbclid && { fbclid: attributionData.fbclid }),
              ...(attributionData.msclkid && { msclkid: attributionData.msclkid }),
              ...(attributionData.ttclid && { ttclid: attributionData.ttclid }),
              ...(referrer && { referrer }),
              ...(resolvedEntryPage && { entryPage: resolvedEntryPage }),
              ...(attributionData.country && { country: attributionData.country }),
            },
          });
        }
      }
    } else {
      const authAdmin = await appUserAdmin();
      const clerkUser = await authAdmin.users.getUser(userId);
      const existingPublicMetadata = (clerkUser.publicMetadata || {}) as Record<string, unknown>;
      await authAdmin.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existingPublicMetadata,
          ...(attributionData.utm_source && { utm_source: attributionData.utm_source }),
          ...(attributionData.utm_medium && { utm_medium: attributionData.utm_medium }),
          ...(attributionData.utm_campaign && { utm_campaign: attributionData.utm_campaign }),
          ...(attributionData.utm_content && { utm_content: attributionData.utm_content }),
          ...(attributionData.utm_term && { utm_term: attributionData.utm_term }),
          ...(attributionData.gclid && { gclid: attributionData.gclid }),
          ...(attributionData.gbraid && { gbraid: attributionData.gbraid }),
          ...(attributionData.wbraid && { wbraid: attributionData.wbraid }),
          ...(attributionData.google_ads_campaign_id && {
            google_ads_campaign_id: attributionData.google_ads_campaign_id,
          }),
          ...(attributionData.fbclid && { fbclid: attributionData.fbclid }),
          ...(attributionData.msclkid && { msclkid: attributionData.msclkid }),
          ...(attributionData.ttclid && { ttclid: attributionData.ttclid }),
          ...(referrer && { referrer }),
          ...(resolvedEntryPage && { entryPage: resolvedEntryPage }),
          ...(attributionData.country && { country: attributionData.country }),
        },
      });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");
    const userFilter = matchUsersCollectionByWebUserIds(userId);
    const existingUser = await usersCollection.findOne(userFilter);
    const existingPublicMetadataFromDoc = (existingUser?.publicMetadata || {}) as Record<
      string,
      unknown
    >;

    const insertId = isLikelySupabaseAuthUserId(userId)
      ? supabaseAuthUserIdFieldsOnUserDoc(userId)
      : { clerkUserId: userId };

    await db.collection("users").updateOne(
      userFilter,
      {
        $set: {
          publicMetadata: {
            ...existingPublicMetadataFromDoc,
            ...attributionData,
            acquisitionDate: existingPublicMetadataFromDoc.acquisitionDate || nowIso,
          },
          attribution: {
            firstTouch: (existingUser as Record<string, any> | null)?.attribution?.firstTouch || {
              source,
              medium,
              campaign,
              content,
              term,
              gclid: attributionData.gclid || null,
              gbraid: attributionData.gbraid || null,
              wbraid: attributionData.wbraid || null,
              googleAdsCampaignId: attributionData.google_ads_campaign_id || null,
              fbclid: attributionData.fbclid || null,
              msclkid: attributionData.msclkid || null,
              ttclid: attributionData.ttclid || null,
              entryPage: resolvedEntryPage,
              referrer: referrer || null,
              country: resolvedCountry,
              currency: resolvedCurrency,
              timestamp: nowIso,
            },
            lastTouch: {
              source,
              medium,
              campaign,
              content,
              term,
              gclid: attributionData.gclid || null,
              gbraid: attributionData.gbraid || null,
              wbraid: attributionData.wbraid || null,
              googleAdsCampaignId: attributionData.google_ads_campaign_id || null,
              fbclid: attributionData.fbclid || null,
              msclkid: attributionData.msclkid || null,
              ttclid: attributionData.ttclid || null,
              entryPage: resolvedEntryPage,
              referrer: referrer || null,
              country: resolvedCountry,
              currency: resolvedCurrency,
              timestamp: nowIso,
            },
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          ...insertId,
        },
      },
      { upsert: true }
    );

    await db.collection("user_attribution_events").insertOne({
      userId,
      sessionId: sessionId || null,
      eventType: "attribution_update",
      source,
      medium,
      campaign,
      content,
      term,
      gclid: attributionData.gclid || null,
      gbraid: attributionData.gbraid || null,
      wbraid: attributionData.wbraid || null,
      googleAdsCampaignId: attributionData.google_ads_campaign_id || null,
      fbclid: attributionData.fbclid || null,
      msclkid: attributionData.msclkid || null,
      ttclid: attributionData.ttclid || null,
      entryPage: resolvedEntryPage,
      referrer: referrer || null,
      country: resolvedCountry,
      currency: resolvedCurrency,
      capturedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating attribution:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
