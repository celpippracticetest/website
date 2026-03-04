import * as XLSX from "xlsx";
import mongoClient from "@/lib/mongodb";
import { OnboardingNewRepository } from "@/repositories/onboardingNew.repo";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";
import { getDb } from "@/lib/mongodb";

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
    (user.privateMetadata?.onboardingNew as Record<string, any>) || {};
  const meta: Record<string, any> = { ...existing };

  if (data.action === "askLater") {
    meta.askedLaterAt = new Date().toISOString();
  } else if (data.action === "submit") {
    meta.completed = true;
    meta.answers = {
      ...data.answers,
      answeredAt: new Date().toISOString(),
    };

    const onboardingNewRepo = new OnboardingNewRepository(mongoClient);
    await onboardingNewRepo.createOrUpdateOnboardingNewResult({
      userId: user.id,
      answers: data.answers,
      answeredAt: new Date(),
    });

    // Save to "onboarding" collection
    const db = await getDb();
    await db.collection("onboarding").updateOne(
      { userId: user.id },
      {
        $set: {
          userId: user.id,
          ...data.answers,
          answeredAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Derive minimum required CLB score based on selected sub-goal/program
    const subGoal: string | null = data?.answers?.subGoal || null;
    const primaryGoal = data?.answers?.primaryGoal || null;

    // Map of sub-goals/programs to their minimum required CLB level
    const SUB_GOAL_MIN_CLB: Record<string, number> = {
      "Federal Skilled Worker Program (FSWP)": 7,
      "Canadian Experience Class (CEC) - TEER 0 or 1": 7,
      "Canadian Experience Class (CEC) - TEER 2 or 3": 5,
      "Federal Skilled Trades Program (FSTP)": 4, // Reading/Writing minimum
      "Provincial Nominee Program (PNP)": 4,
      "Citizenship Application (Ages 18-54)": 4,
      "Real Estate License (BC - BCFSA)": 7,
      "Pharmacist License (OCP / National)": 7,
      "College of Physicians and Surgeons (CPSO)": 7,
      "Nursing (Various Provincial Colleges)": 7,
      "Immigration Consultant (CICC)": 9,
      "Post-Graduation Work Permit (PGWP)": 7,
      "Canadian Corporate Employers": 7,
      "Superior English (Highest Points)": 8,
      "Proficient English": 7,
      "Competent English (Minimum for PR)": 6,
      "Temporary Graduate Visa (Subclass 485)": 6,
      "Vocational English (Subclass 482)": 5,
    };

    const minClbRequired: number | null =
      (subGoal && SUB_GOAL_MIN_CLB[subGoal]) || null;

    const previousAttempts = Number(data?.answers?.previousAttempts || 0);

    // Save comprehensive onboarding data to users collection for dashboard customization
    await db.collection("users").updateOne(
      { clerkUserId: user.id },
      {
        $set: {
          intent: {
            primaryGoal,
            // Use derived minimum CLB requirement as targetScore
            targetScore: Number.isFinite(minClbRequired) ? minClbRequired : null,
            previousAttempts: Number.isFinite(previousAttempts)
              ? previousAttempts
              : 0,
            updatedAt: new Date(),
          },
          // Save full onboarding data for dashboard customization
          onboarding: {
            primaryGoal: data.answers.primaryGoal || null,
            customPrimaryGoal: data.answers.customPrimaryGoal || null,
            subGoal: data.answers.subGoal || null,
            customSubGoal: data.answers.customSubGoal || null,
            testDate: data.answers.testDate || null,
            focusSkill: data.answers.focusSkill || null,
            customFocusSkill: data.answers.customFocusSkill || null,
            targetScore: data.answers.targetScore || null,
            completedAt: new Date(),
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
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await clerkClient.users.updateUser(user.id, {
    privateMetadata: {
      ...user.privateMetadata,
      onboardingNew: meta,
    },
    publicMetadata: user.publicMetadata,
  });

  return NextResponse.json({ ok: true });
}

// GET: Get paginated onboarding new data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    console.log(`⏳ Fetching onboarding new results... Page: ${page}, Limit: ${limit}`);
    const onboardingNewRepo = new OnboardingNewRepository(mongoClient);
    
    // Get paginated data
    const results = await onboardingNewRepo.getOnboardingNewResultsPaginated(page, limit);
    const totalCount = await onboardingNewRepo.getOnboardingNewResultsCount();
    
    // Get all data for statistics (not paginated)
    const allResults = await onboardingNewRepo.getAllOnboardingNewResults();
    
    // Calculate statistics from all data
    const stats = {
      primaryGoals: allResults.filter(item => item.answers?.primaryGoal).length,
      focusSkills: allResults.filter(item => item.answers?.focusSkill).length,
      customFocusSkills: allResults.filter(item => item.answers?.customFocusSkill).length,
      averageTargetScore: allResults.length > 0 ? 
        Math.round((allResults.reduce((sum, item) => {
          const scores = item.answers?.targetScores || {};
          return sum + (scores.listening || 0) + (scores.reading || 0) + (scores.writing || 0) + (scores.speaking || 0);
        }, 0) / (allResults.length * 4)) * 10) / 10 : 0
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
    console.error("❌ Error fetching onboarding new data:", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
