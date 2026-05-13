export class ReferralRepository {
  client: any;
  dbName: string | undefined;
  db: any;
  col: any;

  constructor(client: any) {
    this.client = client;
    this.dbName = process.env.APP_DOCUMENTS_DB?.trim();
    this.db = this.dbName ? this.client.db(this.dbName) : this.client.db();
    this.col = this.db.collection("referralCodes");
  }

  async ensureIndexes() {
    await this.col.createIndex({ code: 1 }, { unique: true });
    await this.col.createIndex({ userId: 1 }, { unique: true });
  }

  async findOneByUserId(userId: string) {
    return this.col.findOne({ userId });
  }

  async findOneByCode(code: string) {
    return this.col.findOne({ code });
  }

  async insert(doc: { code: string; userId: string; createdAt: Date }) {
    return this.col.insertOne(doc);
  }

  async deleteByUserId(userId: string) {
    return this.col.deleteOne({ userId });
  }

  getCollection() {
    return this.col;
  }
}
