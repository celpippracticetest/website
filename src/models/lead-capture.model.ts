import { ObjectId } from "mongodb";
import { z } from "zod";

const LeadCaptureTriggerSchema = z.object({
  enabled: z.boolean().default(true),
  value: z.number().int().nonnegative(),
});

const LeadCaptureAudienceSchema = z.object({
  showToGuest: z.boolean().default(true),
  showToLoggedIn: z.boolean().default(true),
  showToPremium: z.boolean().default(true),
  showToWasPremium: z.boolean().default(true),
});

const LeadCaptureConfigWriteSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Default Lead Capture"),
  headline: z.string().trim().min(1).max(180),
  subHeadline: z.string().trim().min(1).max(320),
  ctaText: z.string().trim().min(1).max(80),
  exitIntent: LeadCaptureTriggerSchema.default({ enabled: true, value: 0 }),
  timeOnPage: LeadCaptureTriggerSchema.default({ enabled: true, value: 30 }),
  scrollDepth: LeadCaptureTriggerSchema.default({ enabled: true, value: 50 }),
  targetPaths: z.array(z.string().trim().min(1)).default([]),
  senderGroupId: z.string().trim().optional(),
  senderGroupName: z.string().trim().optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  audience: LeadCaptureAudienceSchema.default({
    showToGuest: true,
    showToLoggedIn: true,
    showToPremium: true,
    showToWasPremium: true,
  }),
  frequencyCapDays: z.number().int().min(1).max(365).default(30),
  isEnabled: z.boolean().default(true),
});

const LeadCaptureConfigSchema = z.object({
  _id: z.instanceof(ObjectId),
  configKey: z.string().min(1),
  ...LeadCaptureConfigWriteSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const LeadCaptureConfigSchemaDto = z.object({
  id: z.string(),
  ...LeadCaptureConfigSchema.omit({ _id: true }).shape,
});

const LeadCapturePublicConfigSchema = LeadCaptureConfigWriteSchema;

const LeadTriggerSourceEnumSchema = z.enum([
  "exit_intent",
  "time_on_page",
  "scroll_depth",
  "manual",
]);

const LeadCaptureLeadWriteSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().toLowerCase(),
  sourceUrl: z.string().trim().min(1).max(1000),
  leadCaptureId: z.string().trim().optional(),
  leadCaptureName: z.string().trim().optional(),
  senderGroupId: z.string().trim().optional(),
  triggerSource: LeadTriggerSourceEnumSchema.default("manual"),
  userAgent: z.string().trim().max(400).optional(),
  ipAddress: z.string().trim().max(120).optional(),
  senderSyncStatus: z
    .enum(["pending", "synced", "failed"])
    .default("pending"),
  senderSyncError: z.string().trim().max(1200).optional(),
});

const LeadCaptureLeadSchema = z.object({
  _id: z.instanceof(ObjectId),
  ...LeadCaptureLeadWriteSchema.shape,
  emailLower: z.string().email(),
  subscribedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const LeadCaptureLeadSchemaDto = z.object({
  id: z.string(),
  ...LeadCaptureLeadSchema.omit({ _id: true }).shape,
});

type TLeadCaptureConfigWriteInput = z.infer<typeof LeadCaptureConfigWriteSchema>;
type TLeadCaptureConfigSchema = z.infer<typeof LeadCaptureConfigSchema>;
type TLeadCaptureConfigSchemaDto = z.infer<typeof LeadCaptureConfigSchemaDto>;
type TLeadCapturePublicConfig = z.infer<typeof LeadCapturePublicConfigSchema>;
type TLeadCaptureLeadWriteInput = z.infer<typeof LeadCaptureLeadWriteSchema>;
type TLeadCaptureLeadSchema = z.infer<typeof LeadCaptureLeadSchema>;
type TLeadCaptureLeadSchemaDto = z.infer<typeof LeadCaptureLeadSchemaDto>;
type TLeadTriggerSource = z.infer<typeof LeadTriggerSourceEnumSchema>;

export {
  LeadCaptureTriggerSchema,
  LeadCaptureAudienceSchema,
  LeadCaptureConfigWriteSchema,
  LeadCaptureConfigSchema,
  LeadCaptureConfigSchemaDto,
  LeadCapturePublicConfigSchema,
  LeadTriggerSourceEnumSchema,
  LeadCaptureLeadWriteSchema,
  LeadCaptureLeadSchema,
  LeadCaptureLeadSchemaDto,
};
export type {
  TLeadCaptureConfigWriteInput,
  TLeadCaptureConfigSchema,
  TLeadCaptureConfigSchemaDto,
  TLeadCapturePublicConfig,
  TLeadCaptureLeadWriteInput,
  TLeadCaptureLeadSchema,
  TLeadCaptureLeadSchemaDto,
  TLeadTriggerSource,
};
