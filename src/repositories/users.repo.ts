import { TUser, TUserDto, UserSchema, UserSchemaDto } from "@/models/users.mode";
import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";

export class UserRepository {
  private readonly db: Db;

  constructor(mongoClient: MongoClient) {
    this.db = mongoClient.db();
  }

  private getUserCollection() {
    return this.db.collection<TUser>("users");
  }

  private convertFromEntity(userEntity: TUser): TUserDto {
    const user: TUserDto = {
      id: userEntity._id.toHexString(),
      ...userEntity,
    };
    return UserSchemaDto.parse(user);
  }
  async findUser(id: string): Promise<TUserDto | null> {
    const entity = await this.getUserCollection().findOne({ _id: new ObjectId(id) });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async findUserBySub(sub: string): Promise<TUserDto | null> {
    const entity = await this.getUserCollection().findOne({ sub });
    return entity ? this.convertFromEntity(entity) : null;
  }

  async createUser(dto: Omit<TUserDto, "id">): Promise<TUserDto> {
    const user = UserSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const { insertedId } = await this.getUserCollection().insertOne(user);
    return this.convertFromEntity({ ...dto, _id: insertedId });
  }

    async updateUser(sub: string, dto: Omit<Partial<TUserDto>, "id">): Promise<TUserDto | null> {
      const candidate = UserSchema.partial().parse(dto);

      const result = await this.getUserCollection().findOneAndUpdate(
        { sub },
        { $set: candidate },
        { returnDocument: "after" , upsert: true}
      );
      return result ? this.convertFromEntity(result) : null;
    }

  //   async deleteUser(id: string): Promise<void> {
  //     await this.getUserCollection().deleteOne({ _id: new ObjectId(id) });
  //   }
}
