import * as XLSX from "xlsx";
import documentsClient from "@/lib/appDocumentsClient";
import { OnboardingRepository } from "@/repositories/onboarding.repo";
import { NextResponse } from "next/server";
import { appUserAdmin, currentUser } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { getStripeSubscriptionDurationForAuthUser } from "@/lib/stripeSubscriptionSummary";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

export const runtime = "nodejs";
export const maxDuration = 60; // Stripe enrichment per row needs headroom

export async function POST(req: Request) {
  // Get the current authenticated user
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();

  const privMeta = user.privateMetadata as Record<string, unknown> | undefined;
  const existingOnboarding =
    (privMeta?.onboarding as Record<string, any>) || {};
  const existingOnboardingNew =
    (privMeta?.onboardingNew as Record<string, any>) || {};
  const onboardingMeta: Record<string, any> = { ...existingOnboarding };
  const onboardingNewMeta: Record<string, any> = { ...existingOnboardingNew };
  const isNewOnboardingPayload = Boolean(
    data?.answers &&
      (Object.prototype.hasOwnProperty.call(data.answers, "primaryGoal") ||
        Object.prototype.hasOwnProperty.call(data.answers, "focusSkill") ||
        Object.prototype.hasOwnProperty.call(data.answers, "targetScores"))
  );

  if (data.action === "askLater") {
    const askedLaterAt = new Date().toISOString();
    if (isNewOnboardingPayload) {
      onboardingNewMeta.askedLaterAt = askedLaterAt;
      onboardingNewMeta.completed = true;
      onboardingNewMeta.skippedAt = askedLaterAt;
    } else {
      onboardingMeta.askedLaterAt = askedLaterAt;
    }
  } else if (data.action === "skip") {
    onboardingNewMeta.completed = true;
    onboardingNewMeta.skippedAt = new Date().toISOString();
  } else if (data.action === "submit") {
    const payloadWithAnsweredAt = {
      ...data.answers,
      answeredAt: new Date().toISOString(),
    };
    if (isNewOnboardingPayload) {
      onboardingNewMeta.completed = true;
      onboardingNewMeta.answers = payloadWithAnsweredAt;
    } else {
      onboardingMeta.completed = true;
      onboardingMeta.answers = payloadWithAnsweredAt;
    }

    if (isNewOnboardingPayload) {
      const db = await getDb();
      await db.collection("onboarding").updateOne(
        { userId: user.id },
        {
          $set: {
            userId: user.id,
            answers: data.answers,
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

      // Keep intent/profile customization behavior for the new onboarding flow.
      const subGoal: string | null = data?.answers?.subGoal || null;
      const primaryGoal = data?.answers?.primaryGoal || null;
      const SUB_GOAL_MIN_CLB: Record<string, number> = {
        "Federal Skilled Worker Program (FSWP)": 7,
        "Canadian Experience Class (CEC) - TEER 0 or 1": 7,
        "Canadian Experience Class (CEC) - TEER 2 or 3": 5,
        "Federal Skilled Trades Program (FSTP)": 4,
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

      await db.collection("users").updateOne(
        matchUsersCollectionByWebUserIds(user.id),
        {
          $set: {
            intent: {
              primaryGoal,
              targetScore: Number.isFinite(minClbRequired)
                ? minClbRequired
                : null,
              previousAttempts: Number.isFinite(previousAttempts)
                ? previousAttempts
                : 0,
              updatedAt: new Date(),
            },
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
      const onboardingRepo = new OnboardingRepository(documentsClient);
      await onboardingRepo.createOrUpdateOnboardingResult({
        userId: user.id,
        answers: data.answers,
        answeredAt: new Date(),
      });
    }
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const authAdmin = await appUserAdmin();
  const publicMetadata: Record<string, unknown> = {
    ...(user.publicMetadata as Record<string, unknown>),
  };
  if (data.action === "submit" && isNewOnboardingPayload) {
    publicMetadata.onboardingSurveyCompleted = true;
  }

  await authAdmin.users.updateUser(user.id, {
    privateMetadata: {
      ...user.privateMetadata,
      onboarding: onboardingMeta,
      onboardingNew: onboardingNewMeta,
    },
    publicMetadata,
  });

  return NextResponse.json({ ok: true });
}

// GET: Get paginated onboarding data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const view = searchParams.get("view");

    // Compatibility mode for the newer onboarding dashboard while keeping
    // the existing onboarding API shape unchanged by default.
    if (view === "new") {
      const skip = (page - 1) * limit;
      const db = await getDb();
      const onboardingCollection = db.collection("onboarding");
      const onboardingFilter = {
        $and: [
          {
            $or: [
              { "answers.targetScores": { $exists: true } },
              { targetScores: { $exists: true } },
            ],
          },
          {
            $or: [
              {
                "answers.primaryGoal": { $exists: true, $nin: [null, ""] },
              },
              {
                primaryGoal: { $exists: true, $nin: [null, ""] },
              },
            ],
          },
          { "answers.stepOneReasons": { $exists: false } },
          { "answers.stepTwoReasons": { $exists: false } },
          { stepOneReasons: { $exists: false } },
          { stepTwoReasons: { $exists: false } },
        ],
      };

      const results = await onboardingCollection
        .find(onboardingFilter)
        .sort({ answeredAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      const totalCount = await onboardingCollection.countDocuments(onboardingFilter);
      const allResults = await onboardingCollection.find(onboardingFilter).toArray();
      const pickFirstNonEmpty = (...values: any[]) =>
        values.find((value) => {
          if (value === null || value === undefined) return false;
          if (typeof value === "string") return value.trim() !== "";
          return true;
        });
      const getAnswers = (item: any) => {
        const nested = item?.answers || {};
        const top = item || {};
        return {
          primaryGoal:
            pickFirstNonEmpty(nested.primaryGoal, top.primaryGoal) || "",
          customPrimaryGoal:
            pickFirstNonEmpty(
              nested.customPrimaryGoal,
              top.customPrimaryGoal
            ) || "",
          subGoal: pickFirstNonEmpty(nested.subGoal, top.subGoal) || "",
          customSubGoal:
            pickFirstNonEmpty(nested.customSubGoal, top.customSubGoal) || "",
          focusSkill: pickFirstNonEmpty(nested.focusSkill, top.focusSkill) || "",
          customFocusSkill:
            pickFirstNonEmpty(nested.customFocusSkill, top.customFocusSkill) ||
            "",
          testDate: pickFirstNonEmpty(nested.testDate, top.testDate) || "",
          targetScores: nested.targetScores || top.targetScores || {},
        };
      };

      const stats = {
        primaryGoals: allResults.filter((item) => getAnswers(item)?.primaryGoal)
          .length,
        focusSkills: allResults.filter((item) => getAnswers(item)?.focusSkill)
          .length,
        customFocusSkills: allResults.filter(
          (item) => getAnswers(item)?.customFocusSkill
        ).length,
        averageTargetScore:
          allResults.length > 0
            ? Math.round(
                (allResults.reduce((sum, item) => {
                  const scores = getAnswers(item)?.targetScores || {};
                  return (
                    sum +
                    (scores.listening || 0) +
                    (scores.reading || 0) +
                    (scores.writing || 0) +
                    (scores.speaking || 0)
                  );
                }, 0) /
                  (allResults.length * 4)) *
                  10
              ) / 10
            : 0,
      };

      const authAdminForView = await appUserAdmin();
      const processedResults = await Promise.all(
        results.map(async (result) => {
          let name = "";
          let subscriptionDuration = "—";
          try {
            const user = await authAdminForView.users.getUser(String(result.userId));
            name = (user.firstName || "") + " " + (user.lastName || "");
            subscriptionDuration =
              await getStripeSubscriptionDurationForAuthUser(
                String(result.userId),
                user
              );
          } catch (e) {
            console.warn("⚠️ Auth user not found for:", result.userId);
          }

          return {
            ...result,
            answers: getAnswers(result),
            name: name.trim(),
            subscriptionDuration,
          };
        })
      );

      return NextResponse.json({
        data: processedResults,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        statistics: stats,
      });
    }

    console.log(`⏳ Fetching onboarding results... Page: ${page}, Limit: ${limit}`);
    const onboardingRepo = new OnboardingRepository(documentsClient);
    
    // Get paginated data
    const results = await onboardingRepo.getOnboardingResultsPaginated(page, limit);
    const totalCount = await onboardingRepo.getOnboardingResultsCount();
    
    // Get all data for statistics (not paginated)
    const allResults = await onboardingRepo.getAllOnboardingResults();
    
    // Calculate statistics from all data
    const stats = {
      part1Answers: allResults.filter(item => {
        const reasons = item.answers?.stepOneReasons;
        return Array.isArray(reasons) && reasons.length > 0;
      }).length,
      part2Answers: allResults.filter(item => {
        const reasons = item.answers?.stepTwoReasons;
        return Array.isArray(reasons) && reasons.length > 0;
      }).length,
      customAnswers: allResults.filter(item => item.answers?.customReason || item.answers?.customStepTwoReason).length
    };
    

    
    // Process results to include user names
    const authAdminLegacy = await appUserAdmin();
    const processedResults = await Promise.all(
      results.map(async (result) => {
        let name = "";
        try {
          const user = await authAdminLegacy.users.getUser(String(result.userId));
          name = (user.firstName || "") + " " + (user.lastName || "");
        } catch (e) {
          console.warn("⚠️ Auth user not found for:", result.userId);
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

