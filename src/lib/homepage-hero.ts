import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import mongoClient from "@/lib/mongodb";
import type { THomepageHeroScheduleSchemaDto } from "@/models/homepage-hero-schedule.model";
import { HomepageHeroScheduleRepository } from "@/repositories/homepage-hero-schedule.repo";

export const HOMEPAGE_HERO_TIMEZONE = "America/Toronto";

export const DEFAULT_HOMEPAGE_HERO = {
  imageUrl: "/images/hero.png",
  altText: "Hero image of CELPIP preparation platform showing student success",
};

export function getDateInHomepageHeroTimezone(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOMEPAGE_HERO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getActiveHomepageHeroSchedule(): Promise<THomepageHeroScheduleSchemaDto | null> {
  noStore();

  try {
    if (!process.env.MONGODB_URI) {
      return null;
    }

    const repo = new HomepageHeroScheduleRepository(mongoClient);
    await repo.ensureIndexes();

    return await repo.getActiveSchedule(getDateInHomepageHeroTimezone());
  } catch (error) {
    console.error("[homepage-hero] failed to load active schedule:", error);
    return null;
  }
}

export const getHomepageHeroDisplay = cache(async function getHomepageHeroDisplay(): Promise<{
  imageUrl: string;
  altText: string;
}> {
  const schedule = await getActiveHomepageHeroSchedule();

  if (!schedule) {
    return DEFAULT_HOMEPAGE_HERO;
  }

  return {
    imageUrl: schedule.imageUrl,
    altText: schedule.altText,
  };
});
