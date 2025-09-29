import { ObjectId } from "mongodb";
import { z } from "zod";

// League Types
const LeagueTypeSchema = z.enum(["bronze", "silver", "gold"]);
const GroupStatusSchema = z.enum(["active", "completed", "upcoming"]);
const UserLeagueStatusSchema = z.enum(["promoted", "demoted", "safe"]);

// League Schema
const LeagueSchema = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string(),
  type: LeagueTypeSchema,
  description: z.string().optional(),
  requirements: z.object({
    minTrophies: z.number(),
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      points: z.number(),
      description: z.string(),
    })),
  }),
  rewards: z.object({
    promotionPoints: z.number(),
    demotionPoints: z.number(),
    giftCardAmount: z.number().optional(), // Only for Gold League
  }),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// League Group Schema (for matchmaking)
const LeagueGroupSchema = z.object({
  _id: z.instanceof(ObjectId),
  leagueId: z.instanceof(ObjectId),
  groupNumber: z.number(),
  seasonId: z.string(), // Unique identifier for each 7-day season
  startDate: z.date(),
  endDate: z.date(),
  status: GroupStatusSchema.default("active"),
  maxUsers: z.number().default(10), // Maximum users per group
  users: z.array(z.object({
    userId: z.string(),
    points: z.number().default(0),
    position: z.number(),
    status: UserLeagueStatusSchema.default("safe"),
    joinedAt: z.date().default(() => new Date()),
  })),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// User League Points Schema
const UserLeaguePointsSchema = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.string(),
  leagueId: z.instanceof(ObjectId),
  groupId: z.instanceof(ObjectId),
  seasonId: z.string(),
  totalPoints: z.number().default(0),
  pointsBreakdown: z.object({
    mockExams: z.number().default(0),
    practiceSessions: z.number().default(0),
    aiFeedback: z.number().default(0),
    skillsTried: z.number().default(0),
    timeSpent: z.number().default(0), // in minutes
  }),
  tasksCompleted: z.array(z.string()).default([]),
  lastActivityAt: z.date().default(() => new Date()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// League Season Schema (7-day cycles)
const LeagueSeasonSchema = z.object({
  _id: z.instanceof(ObjectId),
  seasonId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean().default(true),
  leagues: z.array(z.object({
    leagueType: LeagueTypeSchema,
    groups: z.array(z.instanceof(ObjectId)),
  })),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// DTOs
const LeagueSchemaDto = z.object({
  id: z.string(),
  ...LeagueSchema.omit({ _id: true }).shape,
});

const LeagueGroupSchemaDto = z.object({
  id: z.string(),
  ...LeagueGroupSchema.omit({ _id: true }).shape,
});

const UserLeaguePointsSchemaDto = z.object({
  id: z.string(),
  ...UserLeaguePointsSchema.omit({ _id: true }).shape,
});

const LeagueSeasonSchemaDto = z.object({
  id: z.string(),
  ...LeagueSeasonSchema.omit({ _id: true }).shape,
});

// Types
type TLeague = z.infer<typeof LeagueSchema>;
type TLeagueDto = z.infer<typeof LeagueSchemaDto>;
type TLeagueGroup = z.infer<typeof LeagueGroupSchema>;
type TLeagueGroupDto = z.infer<typeof LeagueGroupSchemaDto>;
type TUserLeaguePoints = z.infer<typeof UserLeaguePointsSchema>;
type TUserLeaguePointsDto = z.infer<typeof UserLeaguePointsSchemaDto>;
type TLeagueSeason = z.infer<typeof LeagueSeasonSchema>;
type TLeagueSeasonDto = z.infer<typeof LeagueSeasonSchemaDto>;
type TLeagueType = z.infer<typeof LeagueTypeSchema>;
type TGroupStatus = z.infer<typeof GroupStatusSchema>;
type TUserLeagueStatus = z.infer<typeof UserLeagueStatusSchema>;

export {
  LeagueSchema,
  LeagueSchemaDto,
  LeagueGroupSchema,
  LeagueGroupSchemaDto,
  UserLeaguePointsSchema,
  UserLeaguePointsSchemaDto,
  LeagueSeasonSchema,
  LeagueSeasonSchemaDto,
  LeagueTypeSchema,
  GroupStatusSchema,
  UserLeagueStatusSchema,
  TLeague,
  TLeagueDto,
  TLeagueGroup,
  TLeagueGroupDto,
  TUserLeaguePoints,
  TUserLeaguePointsDto,
  TLeagueSeason,
  TLeagueSeasonDto,
  TLeagueType,
  TGroupStatus,
  TUserLeagueStatus,
};
