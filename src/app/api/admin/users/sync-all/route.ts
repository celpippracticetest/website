import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

/**
 * Sync ALL users from Clerk to MongoDB
 * This endpoint processes all users in batches to catch up on failed webhooks
 */
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
    const batchSize = body.batchSize || 100; // Users per batch
    const maxBatches = body.maxBatches || 50; // Max batches to process (safety limit)
    const forceUpdate = body.forceUpdate || false; // Update even existing users

    const clerkClientInstance = await clerkClient();
    const db = client.db();
    const usersCollection = db.collection("users");

    // Get total count first
    const firstPage = await clerkClientInstance.users.getUserList({
      limit: 1,
    });
    const totalUsers = firstPage.totalCount || 0;

    if (totalUsers === 0) {
      return NextResponse.json({
        success: true,
        message: "No users found in Clerk",
        synced: 0,
        updated: 0,
        skipped: 0,
        totalProcessed: 0,
        totalUsers: 0,
      });
    }

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;
    const allErrors: string[] = [];
    let offset = 0;
    let batchNumber = 0;

    // Process users in batches
    while (batchNumber < maxBatches) {
      try {
        const clerkUsers = await clerkClientInstance.users.getUserList({
          limit: batchSize,
          offset,
        });

        if (!clerkUsers.data || clerkUsers.data.length === 0) {
          break; // No more users
        }

        let batchSynced = 0;
        let batchUpdated = 0;
        let batchSkipped = 0;

        // Process each user in the batch
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
              batchSkipped++;
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
              batchSynced++;
            } else if (updateResult.modifiedCount > 0) {
              batchUpdated++;
            } else {
              batchSkipped++;
            }
          } catch (error: any) {
            const userId = clerkUser.id || "unknown";
            allErrors.push(`User ${userId}: ${error.message}`);
            console.error(`Error syncing user ${userId}:`, error);
          }
        }

        totalSynced += batchSynced;
        totalUpdated += batchUpdated;
        totalSkipped += batchSkipped;
        totalProcessed += clerkUsers.data.length;
        batchNumber++;
        offset += batchSize;

        // Check if we've processed all users
        if (offset >= totalUsers) {
          break;
        }

        // Small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`Error processing batch ${batchNumber + 1}:`, error);
        allErrors.push(`Batch ${batchNumber + 1}: ${error.message}`);
        break; // Stop on batch error
      }
    }

    const summary = {
      success: true,
      message: `Sync completed: ${totalSynced} new users synced, ${totalUpdated} users updated, ${totalSkipped} skipped`,
      synced: totalSynced,
      updated: totalUpdated,
      skipped: totalSkipped,
      totalProcessed,
      totalUsers,
      batchesProcessed: batchNumber,
      hasMore: offset < totalUsers,
      errors: allErrors.length > 0 ? allErrors.slice(0, 20) : undefined, // Limit errors in response
      errorCount: allErrors.length,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error in full user sync:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync all users" },
      { status: 500 }
    );
  }
}
