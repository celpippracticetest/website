import {
  CheckoutSchema,
  CheckoutSchemaDto,
  TCheckoutSchema,
  TCheckoutSchemaDto,
} from "@/models/checkout.model";
import { MongoClient, Db, ObjectId } from "mongodb";

export class CheckoutRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  async findLatestCheckoutByUserId(
    userId: string
  ): Promise<TCheckoutSchemaDto | null> {
    const entity = await this.getCheckoutCollection().findOne(
      { userId, status: "complete" },
      { sort: { createdAt: -1 } }
    );
    return entity ? this.convertFromEntity(entity) : null;
  }

  private getCheckoutCollection() {
    return this.db.collection<TCheckoutSchema>("checkouts");
  }

  public async findBySessionId(sessionId: string) {
    return await this.getCheckoutCollection().findOne({
      checkoutId: sessionId,
    });
  }

  private convertFromEntity(checkoutEntity: TCheckout): TCheckoutSchemaDto {
    const checkout: TCheckoutSchemaDto = {
      id: checkoutEntity._id.toHexString(),
      ...checkoutEntity,
    };
    return CheckoutSchemaDto.parse(checkout);
  }
  async findCheckout(id: string): Promise<TCheckoutSchemaDto | null> {
    const entity = await this.getCheckoutCollection().findOne({
      _id: new ObjectId(id),
    });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findCheckoutBySessionId(
    sessionId: string
  ): Promise<TCheckoutSchemaDto | null> {
    const entity = await this.getCheckoutCollection().findOne({
      checkoutId: sessionId,
    });
    return entity ? this.convertFromEntity(entity) : null;
  }
  async updateCreatedAtBySessionId(
    sessionId: string,
    newCreatedAt: Date
  ): Promise<void> {
    await this.getCheckoutCollection().updateOne(
      { checkoutId: sessionId },
      { $set: { createdAt: newCreatedAt } }
    );
  }

  async findAllByUserIdAndStatus(
    userId: string,
    status: string
  ): Promise<TCheckoutSchemaDto[]> {
    const entities = await this.getCheckoutCollection()
      .find({ userId, status })
      .sort({ createdAt: -1 })
      .toArray();

    return entities.map((entity) => this.convertFromEntity(entity));
  }

  async findLastByUserId(userId: string) {
    return await this.getCheckoutCollection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
  }

  async createCheckout(
    dto: Omit<TCheckoutSchemaDto, "id">
  ): Promise<TCheckoutSchemaDto> {
    const checkout = CheckoutSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getCheckoutCollection().insertOne(
      checkout
    );
    return this.convertFromEntity({ ...dto, _id: insertedId });
  }

  async updateCheckout(
    sub: string,
    dto: Omit<Partial<TCheckoutSchemaDto>, "id">
  ): Promise<TCheckoutSchemaDto | null> {
    const candidate = CheckoutSchema.partial().parse(dto);

    const result = await this.getCheckoutCollection().findOneAndUpdate(
      { sub },
      { $set: candidate },
      { returnDocument: "after", upsert: true }
    );
    return result ? this.convertFromEntity(result) : null;
  }

  async updateStatus(checkoutId: string, status: string): Promise<void> {
    await this.getCheckoutCollection().updateOne(
      { checkoutId },
      { $set: { status } }
    );
  }

  async findExpiredOneTimers() {
    const now = new Date();
    const entities = await this.getCheckoutCollection()
      .find({ status: "complete", "lineItems.0.price.recurring": null })
      .toArray();

    const expired: { sessionId: string; userId: string }[] = [];
    for (const entity of entities) {
      const createdAt: any = entity.createdAt;
      const desc: string =
        entity.lineItems?.[0]?.description?.toLowerCase() || "";
      // Determine period in days based on plan description
      let periodDays: number;
      switch (desc) {
        case "weekly":
          periodDays = 7;
          break;
        case "monthly":
          periodDays = 30;
          break;
        case "3month":
          periodDays = 90;
          break;
        default:
          periodDays = 365;
      }
      const expiresAt = new Date(
        createdAt.getTime() + periodDays * 24 * 60 * 60 * 1000
      );
      if (expiresAt <= now) {
        expired.push({ sessionId: entity.checkoutId, userId: entity.userId });
      }
    }
    return expired;
  }

  async findAllByUserId(userId: string): Promise<TCheckoutSchemaDto[]> {
    const entities = await this.getCheckoutCollection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return entities.map((entity) => this.convertFromEntity(entity));
  }
}
