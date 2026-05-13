import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import client from "@/lib/appDocumentsClient";
import {
  matchUsersCollectionByWebUserIds,
  supabaseAuthUserIdFieldsOnUserDoc,
} from "@/lib/users/userDocumentIdentity";

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authenticate = await auth();
    const isAdmin =
      sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 100; // Default to 100 users per sync
    const offset = body.offset || 0;
    const forceUpdate = body.forceUpdate || false; // If true, update even existing users

    const adminClient = await appUserAdmin();
    const db = client.db();
    const usersCollection = db.collection("users");

    // Fetch users from Supabase Auth
    const authUsersPage = await adminClient.users.getUserList({
      limit,
      offset,
    });

    if (!authUsersPage.data || authUsersPage.data.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        skipped: 0,
        updated: 0,
        total: 0,
        message: "No users found in Supabase Auth",
      });
    }

    let synced = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const authUser of authUsersPage.data) {
      try {
        const userId = authUser.id;
        const email =
          authUser.emailAddresses?.[0]?.emailAddress ||
          authUser.primaryEmailAddress?.emailAddress;
        const firstName = authUser.firstName;
        const lastName = authUser.lastName;
        const imageUrl = authUser.imageUrl;
        const publicMetadata = (authUser.publicMetadata || {}) as Record<
          string,
          any
        >;

        const userIdFilter = matchUsersCollectionByWebUserIds(userId);

        // Check if user already exists in the document store
        const existingUser = await usersCollection.findOne(userIdFilter);

        if (existingUser && !forceUpdate) {
          skipped++;
          continue;
        }

        // Sync/Update user document
        const updateResult = await usersCollection.updateOne(
          userIdFilter,
          {
            $set: {
              ...supabaseAuthUserIdFieldsOnUserDoc(userId),
              email: email || null,
              firstName: firstName || null,
              lastName: lastName || null,
              imageUrl: imageUrl || null,
              publicMetadata: publicMetadata,
              plan: publicMetadata.plan || "free",
              planType: publicMetadata.planType || null,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (updateResult.upsertedCount > 0) {
          synced++;
        } else if (updateResult.modifiedCount > 0) {
          updated++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        const userId = authUser.id || "unknown";
        errors.push(`Failed to sync user ${userId}: ${error.message}`);
        console.error(`Error syncing user ${userId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      updated,
      skipped,
      total: authUsersPage.data.length,
      hasMore: authUsersPage.totalCount
        ? offset + limit < authUsersPage.totalCount
        : false,
      nextOffset: offset + limit,
      totalAuthUsers: authUsersPage.totalCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors in response
      errorCount: errors.length,
      message: `Synced ${synced} new users, updated ${updated} existing users, skipped ${skipped} unchanged users`,
    });
  } catch (error: any) {
    console.error("Error syncing users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync users" },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many users are missing
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authenticate = await auth();
    const isAdmin =
      sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = await appUserAdmin();
    const db = client.db();
    const usersCollection = db.collection("users");

    // Total users in Supabase Auth (directory)
    const authDirectoryPage = await adminClient.users.getUserList({
      limit: 1,
    });
    const totalAuthUsers = authDirectoryPage.totalCount || 0;

    // Get count from the document store
    const usersInDocumentsCount = await usersCollection.countDocuments({
      $or: [
        { clerkUserId: { $exists: true, $nin: [null, ""] } },
        { supabaseUserId: { $exists: true, $nin: [null, ""] } },
        { sub: { $exists: true, $nin: [null, ""] } },
      ],
    });

    const missingCount = Math.max(0, totalAuthUsers - usersInDocumentsCount);

    return NextResponse.json({
      totalAuthUsers,
      totalUsersInDocuments: usersInDocumentsCount,
      missingUsers: missingCount,
      syncNeeded: missingCount > 0,
    });
  } catch (error: any) {
    console.error("Error checking user sync status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check sync status" },
      { status: 500 }
    );
  }
}
