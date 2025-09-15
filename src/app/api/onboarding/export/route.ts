import * as XLSX from "xlsx";
import mongoClient from "@/lib/mongodb";
import { OnboardingRepository } from "@/repositories/onboarding.repo";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for export

// GET: Export onboarding data as Excel
export async function GET() {
  try {
    console.log("⏳ Exporting onboarding results...");
    const onboardingRepo = new OnboardingRepository(mongoClient);
    const results = await onboardingRepo.getAllOnboardingResults();

    const workbookData: any[] = [];
    const stats: Record<string, number> = {};

    for (const result of results) {
      const userId = result.userId;
      const answers = result.answers || {};
      let name = "";

      try {
        const user = await clerkClient.users.getUser(userId);
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

    console.log("📊 Workbook rows:", workbookData.length);
    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Onboarding Data");

    console.log("📝 Writing Excel file to buffer...");
    const fileBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    console.log("✅ Buffer created successfully.");

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
