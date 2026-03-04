import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authenticate = await auth();
    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 100; // Default to 100 users per sync
    const offset = body.offset || 0;
    const forceUpdate = body.forceUpdate || false; // If true, update even existing users

    const clerkClientInstance = await clerkClient();
    const db = client.db();
    const usersCollection = db.collection("users");

    // Fetch users from Clerk
    const clerkUsers = await clerkClientInstance.users.getUserList({
      limit,
      offset,
    });

    if (!clerkUsers.data || clerkUsers.data.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        skipped: 0,
        updated: 0,
        total: 0,
        message: "No users found in Clerk",
      });
    }

    let synced = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process each user
    for (const clerkUser of clerkUsers.data) {
      try {
        const userId = clerkUser.id;
        const email =
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          clerkUser.primaryEmailAddress?.emailAddress;
        const firstName = clerkUser.firstName;
        const lastName = clerkUser.lastName;
        const imageUrl = clerkUser.imageUrl;
        const publicMetadata = (clerkUser.publicMetadata || {}) as Record<
          string,
          any
        >;

        // Check if user already exists in MongoDB
        const existingUser = await usersCollection.findOne({
          clerkUserId: userId,
        });

        if (existingUser && !forceUpdate) {
          skipped++;
          continue;
        }

        // Sync/Update user to MongoDB
        const updateResult = await usersCollection.updateOne(
          { clerkUserId: userId },
          {
            $set: {
              clerkUserId: userId,
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
        const userId = clerkUser.id || "unknown";
        errors.push(`Failed to sync user ${userId}: ${error.message}`);
        console.error(`Error syncing user ${userId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      updated,
      skipped,
      total: clerkUsers.data.length,
      hasMore: clerkUsers.totalCount
        ? offset + limit < clerkUsers.totalCount
        : false,
      nextOffset: offset + limit,
      totalClerkUsers: clerkUsers.totalCount,
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
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clerkClientInstance = await clerkClient();
    const db = client.db();
    const usersCollection = db.collection("users");

    // Get total count from Clerk
    const clerkUsers = await clerkClientInstance.users.getUserList({
      limit: 1,
    });
    const totalClerkUsers = clerkUsers.totalCount || 0;

    // Get count from MongoDB
    const mongoUserCount = await usersCollection.countDocuments({
      clerkUserId: { $exists: true, $ne: null },
    });

    const missingCount = Math.max(0, totalClerkUsers - mongoUserCount);

    return NextResponse.json({
      totalClerkUsers,
      totalMongoUsers: mongoUserCount,
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
