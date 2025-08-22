import { ObjectId } from "mongodb";
import { z } from "zod";

const ReferralRewardSchema = z.object({
  _id: z.instanceof(ObjectId),
  inviterId: z.string(),
  inviteeId: z.string(),
  referralCode: z.string(),
  amount: z.number(),
  status: z.enum(["pending", "confirmed", "paid"]).default("pending"),
  checkoutId: z.string(),
  planPurchased: z.string(),
  purchaseAmount: z.number(),
  purchaseDate: z.date(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

const ReferralRewardSchemaDto = z.object({
  id: z.string(),
  ...ReferralRewardSchema.omit({ _id: true }).shape,
});

type TReferralRewardSchema = z.infer<typeof ReferralRewardSchema>;
type TReferralRewardSchemaDto = z.infer<typeof ReferralRewardSchemaDto>;

export { ReferralRewardSchema, ReferralRewardSchemaDto };
export type { TReferralRewardSchema, TReferralRewardSchemaDto };
