import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      gclid,
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
    if (utm_source) attributionData.utm_source = utm_source;
    if (utm_medium) attributionData.utm_medium = utm_medium;
    if (utm_campaign) attributionData.utm_campaign = utm_campaign;
    if (utm_content) attributionData.utm_content = utm_content;
    if (utm_term) attributionData.utm_term = utm_term;
    if (entryPage) attributionData.entryPage = entryPage;
    if (country) attributionData.country = country;
    if (currency) attributionData.currency = currency;

    if (Object.keys(attributionData).length === 0) {
      return NextResponse.json({ message: "No attribution data provided" });
    }

    const nowIso = new Date().toISOString();
    const source = attributionData.utm_source || (attributionData.gclid ? "google_ads" : "direct");
    const medium = attributionData.utm_medium || null;
    const campaign = attributionData.utm_campaign || null;
    const content = attributionData.utm_content || null;
    const term = attributionData.utm_term || null;
    const resolvedEntryPage = attributionData.entryPage || null;
    const resolvedCountry = attributionData.country || null;
    const resolvedCurrency = attributionData.currency || null;

    // Update Clerk metadata
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const existingPublicMetadata = (clerkUser.publicMetadata || {}) as Record<string, any>;
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...existingPublicMetadata,
        ...attributionData,
        acquisitionDate: existingPublicMetadata.acquisitionDate || nowIso,
        firstTouch: existingPublicMetadata.firstTouch || {
          source,
          medium,
          campaign,
          content,
          term,
          gclid: attributionData.gclid || null,
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
          entryPage: resolvedEntryPage,
          referrer: referrer || null,
          country: resolvedCountry,
          currency: resolvedCurrency,
          timestamp: nowIso,
        },
      },
    });

    // Update MongoDB
    const db = client.db();
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ clerkUserId: userId });
    const existingPublicMetadataMongo = (existingUser?.publicMetadata || {}) as Record<string, any>;

    await db.collection("users").updateOne(
      { clerkUserId: userId },
      {
        $set: {
          publicMetadata: {
            ...existingPublicMetadataMongo,
            ...attributionData,
            acquisitionDate: existingPublicMetadataMongo.acquisitionDate || nowIso,
          },
          attribution: {
            firstTouch: existingUser?.attribution?.firstTouch || {
              source,
              medium,
              campaign,
              content,
              term,
              gclid: attributionData.gclid || null,
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
