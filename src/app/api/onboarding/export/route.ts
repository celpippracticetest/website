import * as XLSX from "xlsx";
import mongoClient from "@/lib/mongodb";
import { OnboardingRepository } from "@/repositories/onboarding.repo";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { getStripeSubscriptionDurationForClerkUser } from "@/lib/stripeSubscriptionSummary";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for export

// GET: Export onboarding data as Excel
export async function GET(request: Request) {
  try {
    const clerk = await clerkClient();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "new") {
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
      const results = await onboardingCollection.find(onboardingFilter).toArray();

      const workbookData: any[] = [];
      const stats: Record<string, number> = {};
      const pickFirstNonEmpty = (...values: any[]) =>
        values.find((value) => {
          if (value === null || value === undefined) return false;
          if (typeof value === "string") return value.trim() !== "";
          return true;
        });

      for (const result of results) {
        const userId = result.userId;
        const nestedAnswers = (result as any)?.answers || {};
        const answers = {
          primaryGoal:
            pickFirstNonEmpty(
              nestedAnswers.primaryGoal,
              (result as any)?.primaryGoal
            ) || "",
          customPrimaryGoal:
            pickFirstNonEmpty(
              nestedAnswers.customPrimaryGoal,
              (result as any)?.customPrimaryGoal
            ) || "",
          subGoal:
            pickFirstNonEmpty(nestedAnswers.subGoal, (result as any)?.subGoal) ||
            "",
          customSubGoal:
            pickFirstNonEmpty(
              nestedAnswers.customSubGoal,
              (result as any)?.customSubGoal
            ) || "",
          focusSkill:
            pickFirstNonEmpty(
              nestedAnswers.focusSkill,
              (result as any)?.focusSkill
            ) || "",
          customFocusSkill:
            pickFirstNonEmpty(
              nestedAnswers.customFocusSkill,
              (result as any)?.customFocusSkill
            ) || "",
          testDate:
            pickFirstNonEmpty(
              nestedAnswers.testDate,
              (result as any)?.testDate
            ) || "",
          targetScores:
            nestedAnswers.targetScores || (result as any)?.targetScores || {},
        };
        let name = "";
        let subscriptionDuration = "—";

        try {
          const user = await clerk.users.getUser(userId);
          name = (user.firstName || "") + " " + (user.lastName || "");
          subscriptionDuration =
            await getStripeSubscriptionDurationForClerkUser(userId, user);
        } catch (e) {
          console.warn("⚠️ Clerk user not found for:", userId);
          name = "";
        }

        const primaryGoal = answers.customPrimaryGoal || answers.primaryGoal || "";
        const subGoal = answers.customSubGoal || answers.subGoal || "";
        const focusSkill = answers.focusSkill || "";
        const customFocusSkill = answers.customFocusSkill || "";
        const testDate = answers.testDate || "";
        const targetScores = answers.targetScores || {};

        if (primaryGoal) stats[`Primary Goal: ${primaryGoal}`] = (stats[`Primary Goal: ${primaryGoal}`] || 0) + 1;
        if (subGoal) stats[`Sub Goal: ${subGoal}`] = (stats[`Sub Goal: ${subGoal}`] || 0) + 1;
        if (focusSkill) stats[`Focus Skill: ${focusSkill}`] = (stats[`Focus Skill: ${focusSkill}`] || 0) + 1;

        workbookData.push({
          "User ID": userId,
          Name: name.trim(),
          "Primary Goal": primaryGoal,
          "Sub Goal": subGoal,
          "Focus Skill": focusSkill,
          "Custom Focus Skill": customFocusSkill,
          "Exam Date": testDate,
          "Subscription Duration": subscriptionDuration,
          "Target Listening": targetScores.listening || 0,
          "Target Reading": targetScores.reading || 0,
          "Target Writing": targetScores.writing || 0,
          "Target Speaking": targetScores.speaking || 0,
          "Answered At": result.answeredAt?.toISOString() || "",
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(workbookData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Onboarding Data");
      const fileBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=onboarding_export.xlsx",
          "x-answer-stats": encodeURIComponent(JSON.stringify(stats)),
        },
      });
    }

    const onboardingRepo = new OnboardingRepository(mongoClient);
    const results = await onboardingRepo.getAllOnboardingResults();

    const workbookData: any[] = [];
    const stats: Record<string, number> = {};

    for (const result of results) {
      const userId = result.userId;
      const answers = result.answers || {};
      let name = "";

      try {
        const user = await clerk.users.getUser(userId);
        name = (user.firstName || "") + " " + (user.lastName || "");
      } catch (e) {
        console.warn("⚠️ Clerk user not found for:", userId);
        name = "";
      }

      const part1 = answers.stepOneReasons?.join(", ") || "";
      const part2 = answers.stepTwoReasons?.join(", ") || "";
      const custom1 = answers.customReason || "";
      const custom2 = answers.customStepTwoReason || "";

      for (const item of answers.stepOneReasons || []) {
        stats[item] = (stats[item] || 0) + 1;
      }
      for (const item of answers.stepTwoReasons || []) {
        stats[item] = (stats[item] || 0) + 1;
      }

      workbookData.push({
        "User ID": userId,
        Name: name.trim(),
        "Answer Part 1": part1,
        "Custom Part 1": custom1,
        "Answer Part 2": part2,
        "Custom Part 2": custom2,
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Onboarding Data");

    const fileBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=onboarding_export.xlsx`,
        "x-answer-stats": encodeURIComponent(JSON.stringify(stats)),
      },
    });
  } catch (err) {
    console.error("❌ Error generating Excel export:", err);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}
