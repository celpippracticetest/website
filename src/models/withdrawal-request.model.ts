import { ObjectId } from "bson";
import { z } from "zod";

const WithdrawalRequestSchema = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.string(),
  amount: z.number(),
  paypalEmail: z.string().email(),
  status: z
    .enum(["pending", "approved", "paid", "rejected"])
    .default("pending"),
  userEmail: z.string().email(),
  referralStats: z.object({
    totalInvitees: z.number(),
    totalReward: z.number(),
    referralCode: z.string(),
    inviteeEmails: z.array(z.string()).default([]),
  }),
  planPurchased: z.string(),
  purchaseDate: z.date(),
  adminNotes: z.string().optional(),
  processedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

const WithdrawalRequestSchemaDto = z.object({
  id: z.string(),
  ...WithdrawalRequestSchema.omit({ _id: true }).shape,
});

type TWithdrawalRequestSchema = z.infer<typeof WithdrawalRequestSchema>;
type TWithdrawalRequestSchemaDto = z.infer<typeof WithdrawalRequestSchemaDto>;

export { WithdrawalRequestSchema, WithdrawalRequestSchemaDto };
export type { TWithdrawalRequestSchema, TWithdrawalRequestSchemaDto };
