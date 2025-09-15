import * as XLSX from "xlsx";
import mongoClient from "@/lib/mongodb";
import { OnboardingRepository } from "@/repositories/onboarding.repo";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds timeout

export async function POST(req: Request) {
  // Get the current authenticated user
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();

  const existing =
    (user.privateMetadata?.onboarding as Record<string, any>) || {};
  const meta: Record<string, any> = { ...existing };

  if (data.action === "askLater") {
    meta.askedLaterAt = new Date().toISOString();
  } else if (data.action === "submit") {
    meta.completed = true;
    meta.answers = {
      ...data.answers,
      answeredAt: new Date().toISOString(),
    };

    const onboardingRepo = new OnboardingRepository(mongoClient);
    await onboardingRepo.createOrUpdateOnboardingResult({
      userId: user.id,
      answers: data.answers,
      answeredAt: new Date(),
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await clerkClient.users.updateUser(user.id, {
    privateMetadata: {
      ...user.privateMetadata,
      onboarding: meta,
    },
    publicMetadata: user.publicMetadata,
  });

  return NextResponse.json({ ok: true });
}

// GET: Get paginated onboarding data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    console.log(`⏳ Fetching onboarding results... Page: ${page}, Limit: ${limit}`);
    const onboardingRepo = new OnboardingRepository(mongoClient);
    
    // Get paginated data
    const results = await onboardingRepo.getOnboardingResultsPaginated(page, limit);
    const totalCount = await onboardingRepo.getOnboardingResultsCount();
    
    console.log(`📊 Found ${results.length} results for page ${page}, total count: ${totalCount}`);
    
    // Get all data for statistics (not paginated)
    const allResults = await onboardingRepo.getAllOnboardingResults();
    
    // Calculate statistics from all data
    const stats = {
      part1Answers: new Set(allResults.map(item => {
        const reasons = item.answers?.stepOneReasons;
        return Array.isArray(reasons) ? reasons.join(", ") : (reasons || "");
      }).filter(Boolean)).size,
      part2Answers: new Set(allResults.map(item => {
        const reasons = item.answers?.stepTwoReasons;
        return Array.isArray(reasons) ? reasons.join(", ") : (reasons || "");
      }).filter(Boolean)).size,
      customAnswers: allResults.filter(item => item.answers?.customReason || item.answers?.customStepTwoReason).length
    };
    
    // Process results to include user names
    const processedResults = await Promise.all(
      results.map(async (result) => {
        let name = "";
        try {
          const user = await clerkClient.users.getUser(result.userId);
          name = (user.firstName || "") + " " + (user.lastName || "");
        } catch (e) {
          console.warn("⚠️ Clerk user not found for:", result.userId);
        }
        
        return {
          ...result,
          name: name.trim(),
        };
      })
    );
    
    return NextResponse.json({
      data: processedResults,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics: stats
    });
  } catch (err) {
    console.error("❌ Error fetching onboarding data:", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

