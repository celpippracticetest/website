import { ObjectId } from "bson";
import { z } from "zod";

export const PartnerStatusSchema = z.enum(["pending", "active", "suspended"]);

const PartnerBaseSchema = z.object({
  _id: z.instanceof(ObjectId),
  code: z.string().min(2),
  clerkUserId: z.string(),
  payoutEmail: z.string().email(),
  status: PartnerStatusSchema,
  /** Percent 0–100 for referee’s first subscription discount; omit/null = program default */
  referredDiscountPercent: z.number().min(0).max(100).optional().nullable(),
  /** Percent 0–100 partner earns on referred subscriber’s first payment; omit/null = program default */
  commissionPercent: z.number().min(0).max(100).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TPartnerSchema = z.infer<typeof PartnerBaseSchema>;

const PartnerDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  webUserId: z.string(),
  payoutEmail: z.string(),
  status: PartnerStatusSchema,
  referredDiscountPercent: z.number().nullable().optional(),
  commissionPercent: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TPartnerDto = z.infer<typeof PartnerDtoSchema>;

export function partnerToDto(doc: TPartnerSchema): TPartnerDto {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    webUserId: doc.clerkUserId,
    payoutEmail: doc.payoutEmail,
    status: doc.status,
    referredDiscountPercent:
      typeof doc.referredDiscountPercent === "number"
        ? doc.referredDiscountPercent
        : null,
    commissionPercent:
      typeof doc.commissionPercent === "number" ? doc.commissionPercent : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
