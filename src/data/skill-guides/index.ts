import type { SkillHubType } from "@/lib/seo/siteSchema";
import { listeningGuide } from "./listening";
import { readingGuide } from "./reading";
import { speakingGuide } from "./speaking";
import type { SkillGuide } from "./types";
import { writingGuide } from "./writing";

export const SKILL_GUIDES: Record<SkillHubType, SkillGuide> = {
  listening: listeningGuide,
  reading: readingGuide,
  writing: writingGuide,
  speaking: speakingGuide,
};

export type { GuideSection, SkillGuide } from "./types";
