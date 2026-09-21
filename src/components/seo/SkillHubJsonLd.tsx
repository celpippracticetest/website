import { JsonLd } from "@/components/seo/JsonLd";
import { skillPagesContent } from "@/data/skill-pages-content";
import {
  buildSkillHubJsonLdBlocks,
  type SkillHubType,
} from "@/lib/seo/siteSchema";
import type { SkillLandingAvailableTask } from "@/lib/skillLandingTasks";

export function SkillHubJsonLd({
  skillType,
  availableTasks,
}: {
  skillType: SkillHubType;
  availableTasks: SkillLandingAvailableTask[];
}) {
  const content = skillPagesContent[skillType];
  if (!content) return null;

  const blocks = buildSkillHubJsonLdBlocks({
    skillType,
    content,
    availableTasks,
    baseUrlRaw: process.env.APP_BASE_URL,
  });

  return (
    <>
      {blocks.map((data) => (
        <JsonLd key={String(data["@id"])} data={data} />
      ))}
    </>
  );
}
