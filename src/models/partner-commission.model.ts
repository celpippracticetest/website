import { ObjectId } from "mongodb";
import { z } from "zod";

const PartnerCommissionSchema = z.object({
  _id: z.instanceof(ObjectId),
  partnerId: z.string(),
  subscriberClerkUserId: z.string(),
  paymentProvider: z.enum(["stripe", "paypal", "unknown"]).optional(),
  idempotencyKey: z.string(),
  grossAmount: z.number(),
  commissionRate: z.number(),
  commissionAmount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "paid"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TPartnerCommissionSchema = z.infer<typeof PartnerCommissionSchema>;

const PartnerCommissionDtoSchema = z.object({
  id: z.string(),
  ...PartnerCommissionSchema.omit({ _id: true }).shape,
});

export type TPartnerCommissionDto = z.infer<typeof PartnerCommissionDtoSchema>;

export function partnerCommissionToDto(
  doc: TPartnerCommissionSchema
): TPartnerCommissionDto {
  return {
    id: doc._id.toHexString(),
    partnerId: doc.partnerId,
    subscriberClerkUserId: doc.subscriberClerkUserId,
    paymentProvider: doc.paymentProvider,
    idempotencyKey: doc.idempotencyKey,
    grossAmount: doc.grossAmount,
    commissionRate: doc.commissionRate,
    commissionAmount: doc.commissionAmount,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
