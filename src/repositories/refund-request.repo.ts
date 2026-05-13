import {
  RefundRequestSchema,
  RefundRequestSchemaDto,
  TRefundRejectReason,
  TRefundRequestSchema,
  TRefundRequestSchemaDto,
  TRefundRequestStatus,
  TRefundRequestWriteInput,
} from "@/models/refund-request.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient, AppDocumentsDb as Db } from "@/lib/pg/types";

export class RefundRequestRepository {
  private readonly db: Db;

  constructor(documentsClient: AppDocumentsClient) {
    this.db = documentsClient.db();
  }

  private getCollection() {
    return this.db.collection<TRefundRequestSchema>("refundRequests");
  }

  private convertFromEntity(entity: TRefundRequestSchema): TRefundRequestSchemaDto {
    const dto: TRefundRequestSchemaDto = {
      id: entity._id.toHexString(),
      ...entity,
    };
    return RefundRequestSchemaDto.parse(dto);
  }

  async ensureIndexes() {
    await this.getCollection().createIndex({ userId: 1, createdAt: -1 });
    await this.getCollection().createIndex({ trackingCode: 1 }, { unique: true });
    await this.getCollection().createIndex({ status: 1, updatedAt: -1 });
  }

  async existsByTrackingCode(trackingCode: string): Promise<boolean> {
    const exists = await this.getCollection().findOne(
      { trackingCode },
      { projection: { _id: 1 } }
    );
    return Boolean(exists);
  }

  async createRefundRequest(params: {
    userId: string;
    trackingCode: string;
    input: TRefundRequestWriteInput;
  }): Promise<TRefundRequestSchemaDto> {
    const now = new Date();
    const entity = RefundRequestSchema.parse({
      _id: new ObjectId(),
      userId: params.userId,
      trackingCode: params.trackingCode,
      status: "pending",
      ...params.input,
      createdAt: now,
      updatedAt: now,
    });

    const { insertedId } = await this.getCollection().insertOne(entity);
    return this.convertFromEntity({ ...entity, _id: insertedId });
  }

  async findByTrackingCodeForUser(params: {
    userId: string;
    trackingCode: string;
  }): Promise<TRefundRequestSchemaDto | null> {
    const entity = await this.getCollection().findOne({
      userId: params.userId,
      trackingCode: params.trackingCode,
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async updateStatus(params: {
    id: string;
    status: TRefundRequestStatus;
    rejectionReason?: TRefundRejectReason;
    rejectionMessage?: string;
  }): Promise<TRefundRequestSchemaDto | null> {
    const nextStatus = params.status;
    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: now,
    };

    if (nextStatus === "rejected") {
      updatePayload.rejectionReason = params.rejectionReason;
      updatePayload.rejectionMessage = params.rejectionMessage;
      updatePayload.resolvedAt = now;
    } else if (nextStatus === "done" || nextStatus === "refunded") {
      updatePayload.rejectionReason = undefined;
      updatePayload.rejectionMessage = undefined;
      updatePayload.resolvedAt = now;
    }

    const result = await this.getCollection().findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: Object.fromEntries(
          Object.entries(updatePayload).filter(([, value]) => value !== undefined)
        ),
        ...(nextStatus !== "rejected" ? { $unset: { rejectionReason: "", rejectionMessage: "" } } : {}),
      },
      { returnDocument: "after" }
    );
    const doc = (result as any)?.value ?? result;
    return doc ? this.convertFromEntity(doc as TRefundRequestSchema) : null;
  }
}
