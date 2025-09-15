import * as XLSX from "xlsx";
import mongoClient from "@/lib/mongodb";
import { OnboardingNewRepository } from "@/repositories/onboardingNew.repo";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for export

// GET: Export onboarding new data as Excel
export async function GET() {
  try {
    console.log("⏳ Exporting onboarding new results...");
    const onboardingNewRepo = new OnboardingNewRepository(mongoClient);
    const results = await onboardingNewRepo.getAllOnboardingNewResults();

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

      const testDate = answers.testDate || "";
      const focusSkill = answers.focusSkill || "";
      const customFocusSkill = answers.customFocusSkill || "";
      const targetScores = answers.targetScores || {};

      // Collect stats
      if (testDate) stats[`Test Date: ${testDate}`] = (stats[`Test Date: ${testDate}`] || 0) + 1;
      if (focusSkill) stats[`Focus Skill: ${focusSkill}`] = (stats[`Focus Skill: ${focusSkill}`] || 0) + 1;

      workbookData.push({
        "User ID": userId,
        Name: name.trim(),
        "Test Date": testDate,
        "Focus Skill": focusSkill,
        "Custom Focus Skill": customFocusSkill,
        "Target Listening": targetScores.listening || 0,
        "Target Reading": targetScores.reading || 0,
        "Target Writing": targetScores.writing || 0,
        "Target Speaking": targetScores.speaking || 0,
        "Answered At": result.answeredAt?.toISOString() || "",
      });
    }

    console.log("📊 Workbook rows:", workbookData.length);
    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Onboarding New Data");

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
        "Content-Disposition": `attachment; filename=onboarding_new_export.xlsx`,
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
