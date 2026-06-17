import * as XLSX from "xlsx";
import documentsClient from "@/lib/appDocumentsClient";
import { OnboardingNewRepository } from "@/repositories/onboardingNew.repo";
import { NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const onboardingNewRepo = new OnboardingNewRepository(documentsClient);
    const results = await onboardingNewRepo.getAllOnboardingNewResults();
    const admin = await appUserAdmin();
    const workbookData: Record<string, string | number>[] = [];
    const stats: Record<string, number> = {};

    for (const result of results) {
      const answers = result.answers || {};
      let name = "";
      try {
        const user = await admin.users.getUser(result.userId);
        name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      } catch { name = ""; }

      if (answers.testDate) stats[`Test Date: ${answers.testDate}`] = (stats[`Test Date: ${answers.testDate}`] || 0) + 1;
      if (answers.focusSkill) stats[`Focus Skill: ${answers.focusSkill}`] = (stats[`Focus Skill: ${answers.focusSkill}`] || 0) + 1;

      workbookData.push({
        "User ID": result.userId,
        Name: name,
        "Test Date": answers.testDate || "",
        "Focus Skill": answers.focusSkill || "",
        "Custom Focus Skill": answers.customFocusSkill || "",
        "Target Listening": answers.targetScores?.listening || 0,
        "Target Reading": answers.targetScores?.reading || 0,
        "Target Writing": answers.targetScores?.writing || 0,
        "Target Speaking": answers.targetScores?.speaking || 0,
        "Answered At": result.answeredAt?.toISOString() || "",
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Onboarding New Data");
    const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=onboarding_new_export.xlsx",
        "x-answer-stats": encodeURIComponent(JSON.stringify(stats)),
      },
    });
  } catch (err) {
    console.error("Error generating Excel export:", err);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
