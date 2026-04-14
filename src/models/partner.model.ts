import { ObjectId } from "mongodb";
import { z } from "zod";

export const PartnerStatusSchema = z.enum(["pending", "active", "suspended"]);

const PartnerBaseSchema = z.object({
  _id: z.instanceof(ObjectId),
  code: z.string().min(2),
  clerkUserId: z.string(),
  payoutEmail: z.string().email(),
  status: PartnerStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TPartnerSchema = z.infer<typeof PartnerBaseSchema>;

const PartnerDtoSchema = z.object({
  id: z.string(),
  code: z.string(),
  clerkUserId: z.string(),
  payoutEmail: z.string(),
  status: PartnerStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TPartnerDto = z.infer<typeof PartnerDtoSchema>;

export function partnerToDto(doc: TPartnerSchema): TPartnerDto {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    clerkUserId: doc.clerkUserId,
    payoutEmail: doc.payoutEmail,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
