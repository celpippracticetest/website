import { randomBytes } from "crypto";
import { PartnerRepository } from "@/repositories/partner.repo";
import mongoClient from "@/lib/mongodb";

const PREFIX = "PT";

function randomSegment(): string {
  return randomBytes(4).toString("hex").slice(0, 8).toUpperCase();
}

/** Unique across `partners` and user `referralCodes` (via PartnerRepository.codeExists). */
export async function generateUniquePartnerCode(): Promise<string> {
  const repo = new PartnerRepository(mongoClient);
  await repo.ensureIndexes();
  for (let i = 0; i < 20; i++) {
    const code = `${PREFIX}-${randomSegment()}`;
    if (!(await repo.codeExists(code))) {
      return code;
    }
  }
  throw new Error("Could not allocate partner code");
}
