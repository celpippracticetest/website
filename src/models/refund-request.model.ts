import { ObjectId } from "mongodb";
import { z } from "zod";

const RefundRequestStatusSchema = z.enum([
  "pending",
  "done",
  "under_review",
  "approved",
  "rejected",
  "refunded",
]);

const RefundRequestReasonSchema = z.enum([
  "accidental_purchase",
  "technical_issue",
  "billing_issue",
  "wrong_plan",
  "other",
]);

const RefundRejectReasonSchema = z.enum([
  "outside_refund_window",
  "used_service_after_purchase",
  "duplicate_request",
  "insufficient_details",
  "other",
]);

const RefundRequestWriteSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  reason: RefundRequestReasonSchema,
  details: z.string().trim().min(10).max(2000),
});

const RefundRequestSchema = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.string(),
  trackingCode: z.string(),
  status: RefundRequestStatusSchema.default("pending"),
  rejectionReason: RefundRejectReasonSchema.optional(),
  rejectionMessage: z.string().trim().min(3).max(500).optional(),
  resolvedAt: z.date().optional(),
  ...RefundRequestWriteSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const RefundRequestSchemaDto = z.object({
  id: z.string(),
  ...RefundRequestSchema.omit({ _id: true }).shape,
});

type TRefundRequestWriteInput = z.infer<typeof RefundRequestWriteSchema>;
type TRefundRequestSchema = z.infer<typeof RefundRequestSchema>;
type TRefundRequestSchemaDto = z.infer<typeof RefundRequestSchemaDto>;
type TRefundRequestStatus = z.infer<typeof RefundRequestStatusSchema>;
type TRefundRequestReason = z.infer<typeof RefundRequestReasonSchema>;
type TRefundRejectReason = z.infer<typeof RefundRejectReasonSchema>;

export {
  RefundRequestStatusSchema,
  RefundRequestReasonSchema,
  RefundRejectReasonSchema,
  RefundRequestWriteSchema,
  RefundRequestSchema,
  RefundRequestSchemaDto,
};
export type {
  TRefundRequestWriteInput,
  TRefundRequestSchema,
  TRefundRequestSchemaDto,
  TRefundRequestStatus,
  TRefundRequestReason,
  TRefundRejectReason,
};
