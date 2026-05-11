import fs from "node:fs";
import path from "node:path";

const srcRoot = path.join(process.cwd(), "src");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name.name)) out.push(p);
  }
  return out;
}

for (const file of walk(srcRoot)) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;

  s = s.replace(/^import \{ ObjectId \} from "mongodb";$/gm, 'import { ObjectId } from "bson";');
  s = s.replace(
    /^import \{ MongoClient, Db, ObjectId \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ MongoClient, Db \} from "mongodb";$/gm,
    `import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ Db, MongoClient \} from "mongodb";$/gm,
    `import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ Db, MongoClient, ObjectId \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ MongoClient, Db, ObjectId, Filter \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { Filter } from "mongodb";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ MongoClient, Db, Filter \} from "mongodb";$/gm,
    `import type { Filter } from "mongodb";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ MongoClient, ObjectId \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ Db \} from "mongodb";$/gm,
    `import type { CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ Db, MongoClient, ObjectId, Filter \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { Filter } from "mongodb";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );
  s = s.replace(
    /^import \{ MongoClient, Db, ObjectId \} from "mongodb";$/gm,
    `import { ObjectId } from "bson";
import type { CompatMongoClient as MongoClient, CompatDb as Db } from "@/lib/pg/types";`
  );

  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log("updated", path.relative(process.cwd(), file));
  }
}
