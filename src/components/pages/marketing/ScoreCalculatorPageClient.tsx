"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";

type EducationLevel =
  | "secondary"
  | "oneYear"
  | "bachelor"
  | "twoOrMore"
  | "masters"
  | "phd";

type ForeignWorkYears = "0" | "1" | "2" | "3";
type CanadianWorkYears = "0" | "1" | "2" | "3" | "4" | "5";
type EstimateResult = {
  minClb: number;
  languagePoints: number;
  coreEducationPoints: number;
  coreCanadianWorkPoints: number;
  educationLanguageTransferability: number;
  educationCanadianTransferability: number;
  educationTransferability: number;
  foreignLanguageTransferability: number;
  foreignCanadianTransferability: number;
  foreignWorkTransferability: number;
  transferabilityTotal: number;
  estimatedTotal: number;
};
type SkillKey = "listening" | "reading" | "writing" | "speaking";

const SCORE_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  secondary: "Secondary (high school) or less",
  oneYear: "One-year post-secondary credential",
  bachelor: "Bachelor degree or 3+ year credential",
  twoOrMore: "Two or more post-secondary credentials",
  masters: "Master or professional degree",
  phd: "PhD",
};

const SKILL_ACTIONS: Record<
  SkillKey,
  { label: string; href: string; recommendation: string }
> = {
  listening: {
    label: "Listening",
    href: "/listening",
    recommendation:
      "Train with timed listening tasks and review answer explanations to improve concentration and detail capture.",
  },
  reading: {
    label: "Reading",
    href: "/reading",
    recommendation:
      "Practice skimming/scanning under time pressure and focus on question-type strategies to reduce mistakes.",
  },
  writing: {
    label: "Writing",
    href: "/writing",
    recommendation:
      "Use AI feedback to fix grammar, structure, and coherence issues in Task 1 and Task 2 responses.",
  },
  speaking: {
    label: "Speaking",
    href: "/speaking",
    recommendation:
      "Practice speaking prompts with AI scoring to improve fluency, vocabulary range, and response structure.",
  },
};

function getLanguageAbilityPoints(clb: number, withSpouse: boolean): number {
  if (clb >= 10) return withSpouse ? 32 : 34;
  if (clb === 9) return withSpouse ? 29 : 31;
  if (clb === 8) return withSpouse ? 22 : 23;
  if (clb === 7) return withSpouse ? 16 : 17;
  if (clb === 6) return withSpouse ? 8 : 9;
  if (clb >= 4) return 6;
  return 0;
}

function getCoreEducationPoints(education: EducationLevel, withSpouse: boolean): number {
  const spousePoints: Record<EducationLevel, number> = {
    secondary: 28,
    oneYear: 84,
    bachelor: 112,
    twoOrMore: 119,
    masters: 126,
    phd: 140,
  };

  const noSpousePoints: Record<EducationLevel, number> = {
    secondary: 30,
    oneYear: 90,
    bachelor: 120,
    twoOrMore: 128,
    masters: 135,
    phd: 150,
  };

  return withSpouse ? spousePoints[education] : noSpousePoints[education];
}

function getCoreCanadianWorkPoints(years: CanadianWorkYears, withSpouse: boolean): number {
  const spousePoints: Record<CanadianWorkYears, number> = {
    "0": 0,
    "1": 35,
    "2": 46,
    "3": 56,
    "4": 63,
    "5": 70,
  };

  const noSpousePoints: Record<CanadianWorkYears, number> = {
    "0": 0,
    "1": 40,
    "2": 53,
    "3": 64,
    "4": 72,
    "5": 80,
  };

  return withSpouse ? spousePoints[years] : noSpousePoints[years];
}

function getEducationLanguageTransferability(education: EducationLevel, minClb: number): number {
  if (minClb >= 9) {
    if (education === "secondary") return 0;
    if (education === "oneYear" || education === "bachelor") return 25;
    return 50;
  }

  if (minClb >= 7) {
    if (education === "secondary") return 0;
    if (education === "oneYear" || education === "bachelor") return 13;
    return 25;
  }

  return 0;
}

function getEducationCanadianTransferability(
  education: EducationLevel,
  canadianWorkYears: CanadianWorkYears
): number {
  if (canadianWorkYears === "0") return 0;
  if (education === "secondary") return 0;

  if (canadianWorkYears === "1") {
    if (education === "oneYear" || education === "bachelor") return 13;
    return 25;
  }

  if (education === "oneYear" || education === "bachelor") return 25;
  return 50;
}

function getForeignLanguageTransferability(years: ForeignWorkYears, minClb: number): number {
  if (years === "0") return 0;

  if (minClb >= 9) {
    if (years === "1" || years === "2") return 25;
    return 50;
  }

  if (minClb >= 7) {
    if (years === "1" || years === "2") return 13;
    return 25;
  }

  return 0;
}

function getForeignCanadianTransferability(
  foreignYears: ForeignWorkYears,
  canadianWorkYears: CanadianWorkYears
): number {
  if (foreignYears === "0" || canadianWorkYears === "0") return 0;

  if (canadianWorkYears === "1") {
    if (foreignYears === "1" || foreignYears === "2") return 13;
    return 25;
  }

  if (foreignYears === "1" || foreignYears === "2") return 25;
  return 50;
}

function calculateEstimate({
  listening,
  reading,
  writing,
  speaking,
  withSpouse,
  education,
  foreignWorkYears,
  canadianWorkYears,
}: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  withSpouse: boolean;
  education: EducationLevel;
  foreignWorkYears: ForeignWorkYears;
  canadianWorkYears: CanadianWorkYears;
}): EstimateResult {
  const clbValues = [listening, reading, writing, speaking];
  const minClb = Math.min(...clbValues);
  const languagePoints =
    getLanguageAbilityPoints(listening, withSpouse) +
    getLanguageAbilityPoints(reading, withSpouse) +
    getLanguageAbilityPoints(writing, withSpouse) +
    getLanguageAbilityPoints(speaking, withSpouse);

  const educationLanguageTransferability = getEducationLanguageTransferability(education, minClb);
  const educationCanadianTransferability = getEducationCanadianTransferability(
    education,
    canadianWorkYears
  );
  const educationTransferability = Math.max(
    educationLanguageTransferability,
    educationCanadianTransferability
  );

  const foreignLanguageTransferability = getForeignLanguageTransferability(
    foreignWorkYears,
    minClb
  );
  const foreignCanadianTransferability = getForeignCanadianTransferability(
    foreignWorkYears,
    canadianWorkYears
  );
  const foreignWorkTransferability = Math.max(
    foreignLanguageTransferability,
    foreignCanadianTransferability
  );

  const transferabilityTotal = Math.min(educationTransferability + foreignWorkTransferability, 100);
  const coreEducationPoints = getCoreEducationPoints(education, withSpouse);
  const coreCanadianWorkPoints = getCoreCanadianWorkPoints(canadianWorkYears, withSpouse);
  const estimatedTotal =
    languagePoints + coreEducationPoints + coreCanadianWorkPoints + transferabilityTotal;

  return {
    minClb,
    languagePoints,
    coreEducationPoints,
    coreCanadianWorkPoints,
    educationLanguageTransferability,
    educationCanadianTransferability,
    educationTransferability,
    foreignLanguageTransferability,
    foreignCanadianTransferability,
    foreignWorkTransferability,
    transferabilityTotal,
    estimatedTotal,
  };
}

export default function ScoreCalculatorPageClient() {
  const [listening, setListening] = useState<number>(9);
  const [reading, setReading] = useState<number>(9);
  const [writing, setWriting] = useState<number>(9);
  const [speaking, setSpeaking] = useState<number>(9);
  const [withSpouse, setWithSpouse] = useState<boolean>(false);
  const [education, setEducation] = useState<EducationLevel>("bachelor");
  const [foreignWorkYears, setForeignWorkYears] = useState<ForeignWorkYears>("1");
  const [canadianWorkYears, setCanadianWorkYears] = useState<CanadianWorkYears>("0");

  const estimate = useMemo(() => {
    return calculateEstimate({
      listening,
      reading,
      writing,
      speaking,
      withSpouse,
      education,
      foreignWorkYears,
      canadianWorkYears,
    });
  }, [
    canadianWorkYears,
    education,
    foreignWorkYears,
    listening,
    reading,
    speaking,
    withSpouse,
    writing,
  ]);
  const projectedEstimate = useMemo(() => {
    return calculateEstimate({
      listening: Math.min(listening + 1, 12),
      reading: Math.min(reading + 1, 12),
      writing: Math.min(writing + 1, 12),
      speaking: Math.min(speaking + 1, 12),
      withSpouse,
      education,
      foreignWorkYears,
      canadianWorkYears,
    });
  }, [
    canadianWorkYears,
    education,
    foreignWorkYears,
    listening,
    reading,
    speaking,
    withSpouse,
    writing,
  ]);
  const allAbilitiesAtSix =
    listening === 6 && reading === 6 && writing === 6 && speaking === 6;
  const projectedGain = projectedEstimate.estimatedTotal - estimate.estimatedTotal;
  const weakSkills = useMemo(() => {
    const abilities: { key: SkillKey; score: number }[] = [
      { key: "listening", score: listening },
      { key: "reading", score: reading },
      { key: "writing", score: writing },
      { key: "speaking", score: speaking },
    ];
    const maxScore = Math.max(...abilities.map((ability) => ability.score));
    const baselineWeak = abilities.filter((ability) => ability.score < maxScore);

    if (baselineWeak.length > 0) {
      return baselineWeak.map((ability) => ability.key);
    }

    if (maxScore < 9) {
      return abilities.map((ability) => ability.key);
    }

    return [];
  }, [listening, reading, speaking, writing]);

  return (
    <Box className="max-w-5xl mx-auto px-4 py-10">
      <Box className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Free CELPIP Score Calculator to Estimate Your CRS Points
        </h1>
        <p className="text-slate-700 text-lg">
          Use your CELPIP scores to estimate your CRS points for Express Entry based on official
          core language, education, Canadian work, and skill-transferability criteria. This is
          still an estimate and not an official IRCC result.
        </p>
      </Box>

      <Box className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Enter Your CELPIP Scores</h2>

        <Box className="flex flex-col md:flex-row gap-4 mb-4">
          <Box className="flex-1">
            <label htmlFor="listening" className="block text-sm font-medium text-slate-700 mb-2">
              Listening
            </label>
            <select
              id="listening"
              value={listening}
              onChange={(event) => setListening(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              {SCORE_OPTIONS.map((score) => (
                <option key={`listening-${score}`} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </Box>

          <Box className="flex-1">
            <label htmlFor="reading" className="block text-sm font-medium text-slate-700 mb-2">
              Reading
            </label>
            <select
              id="reading"
              value={reading}
              onChange={(event) => setReading(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              {SCORE_OPTIONS.map((score) => (
                <option key={`reading-${score}`} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </Box>
        </Box>

        <Box className="flex flex-col md:flex-row gap-4 mb-6">
          <Box className="flex-1">
            <label htmlFor="writing" className="block text-sm font-medium text-slate-700 mb-2">
              Writing
            </label>
            <select
              id="writing"
              value={writing}
              onChange={(event) => setWriting(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              {SCORE_OPTIONS.map((score) => (
                <option key={`writing-${score}`} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </Box>

          <Box className="flex-1">
            <label htmlFor="speaking" className="block text-sm font-medium text-slate-700 mb-2">
              Speaking
            </label>
            <select
              id="speaking"
              value={speaking}
              onChange={(event) => setSpeaking(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              {SCORE_OPTIONS.map((score) => (
                <option key={`speaking-${score}`} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </Box>
        </Box>

        <h3 className="text-xl font-semibold text-slate-900 mb-3">Profile Assumptions</h3>
        <Box className="flex flex-col md:flex-row gap-4 mb-4">
          <Box className="flex-1">
            <label htmlFor="education" className="block text-sm font-medium text-slate-700 mb-2">
              Education
            </label>
            <select
              id="education"
              value={education}
              onChange={(event) => setEducation(event.target.value as EducationLevel)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              {Object.entries(EDUCATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Box>

          <Box className="flex-1">
            <label
              htmlFor="foreign-work"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Foreign skilled work experience
            </label>
            <select
              id="foreign-work"
              value={foreignWorkYears}
              onChange={(event) => setForeignWorkYears(event.target.value as ForeignWorkYears)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
            >
              <option value="0">0 years</option>
              <option value="1">1 year</option>
              <option value="2">2 years</option>
              <option value="3">3+ years</option>
            </select>
          </Box>
        </Box>

        <Box className="mb-4">
          <label
            htmlFor="canadian-work"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Canadian skilled work experience
          </label>
          <select
            id="canadian-work"
            value={canadianWorkYears}
            onChange={(event) => setCanadianWorkYears(event.target.value as CanadianWorkYears)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900"
          >
            <option value="0">0 years</option>
            <option value="1">1 year</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
            <option value="4">4 years</option>
            <option value="5">5+ years</option>
          </select>
        </Box>

        <Box className="flex items-center gap-2">
          <input
            id="spouse"
            type="checkbox"
            checked={withSpouse}
            onChange={(event) => setWithSpouse(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="spouse" className="text-sm text-slate-700">
            I have an accompanying spouse/common-law partner
          </label>
        </Box>
      </Box>

      <Box className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Estimated CRS Result</h2>
        <Box className="flex flex-col gap-2 text-slate-800 mb-4">
          <p>Minimum CLB across your four abilities: <strong>CLB {estimate.minClb}</strong></p>
          <p>Core language points estimate: <strong>{estimate.languagePoints}</strong></p>
          <p>Core education points estimate: <strong>{estimate.coreEducationPoints}</strong></p>
          <p>Core Canadian work points estimate: <strong>{estimate.coreCanadianWorkPoints}</strong></p>
          <p>Education transferability (best pathway): <strong>{estimate.educationTransferability}</strong></p>
          <p>Foreign work transferability (best pathway): <strong>{estimate.foreignWorkTransferability}</strong></p>
          <p>Total transferability estimate: <strong>{estimate.transferabilityTotal}</strong></p>
        </Box>
        <p className="text-3xl font-bold text-indigo-700">
          Estimated CRS points covered by this calculator: {estimate.estimatedTotal}
        </p>
        <p className="text-sm text-slate-600 mt-3">
          Not included yet: age, second official language, spouse factors, certificate of
          qualification, provincial nomination, French/additional points, and other program-specific
          factors.
        </p>
      </Box>
      <Box className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">If You Improve Your CLB</h2>
        {allAbilitiesAtSix ? (
          <p className="text-slate-800 mb-2">
            If your CLB moves from <strong>6 to 7</strong> in all four abilities, your covered CRS
            estimate becomes <strong>{projectedEstimate.estimatedTotal}</strong>.
          </p>
        ) : (
          <p className="text-slate-800 mb-2">
            If each ability improves by one CLB band, your covered CRS estimate becomes{" "}
            <strong>{projectedEstimate.estimatedTotal}</strong>.
          </p>
        )}
        <p className="text-emerald-800 font-semibold">
          Estimated gain: +{projectedGain} points
        </p>
      </Box>
      {weakSkills.length > 0 && (
        <Box className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            Weak Skills Action Plan
          </h2>
          <p className="text-slate-700 mb-4">
            Based on your current profile, these skills need the most improvement. Use our targeted
            practice to raise your CLB faster.
          </p>
          <Box className="flex flex-col gap-3">
            {weakSkills.map((skill) => (
              <Box
                key={skill}
                className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <Box>
                  <p className="font-semibold text-slate-900">{SKILL_ACTIONS[skill].label}</p>
                  <p className="text-sm text-slate-700">{SKILL_ACTIONS[skill].recommendation}</p>
                </Box>
                <Link href={SKILL_ACTIONS[skill].href}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Practice {SKILL_ACTIONS[skill].label}
                  </Button>
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">Improve Your CELPIP Score Faster</h2>
        <p className="text-slate-700 mb-4">
          A small increase from CLB 8 to CLB 9 can create a major CRS jump. Practice with full
          CELPIP mock tests, instant scoring, and targeted feedback.
        </p>
        <p className="text-sm text-slate-600 mb-4">
          Source for CRS criteria:{" "}
          <a
            href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-700 underline"
          >
            Canada.ca Comprehensive Ranking System (CRS) criteria
          </a>
          .
        </p>
        <Link href="/exam-overview">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Start Free CELPIP Practice
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
