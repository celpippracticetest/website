const fs = require("fs");
const path = ".env.vercel.preview";
if (!fs.existsSync(path)) {
  console.log("missing", path);
  process.exit(1);
}
const text = fs.readFileSync(path, "utf8");
const line = text.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.log("NO_DATABASE_URL");
  process.exit(1);
}
let v = line.slice("DATABASE_URL=".length).trim();
if (
  (v.startsWith('"') && v.endsWith('"')) ||
  (v.startsWith("'") && v.endsWith("'"))
) {
  v = v.slice(1, -1);
}
console.log("len", v.length);
console.log("prefix", v.slice(0, 40));
console.log("has_local_ref", v.includes("birfgggolfqanmsfciqi"));
const host = (v.match(/@([^/?]+)/) || [])[1] || null;
console.log("host", host);
const ref =
  (v.match(/postgres\.([a-z0-9]+)/) ||
    v.match(/([a-z0-9]{20})\.supabase\.co/) ||
    [])[1] || null;
console.log("ref", ref);
console.log("has_mongo_uri_line", /(?:^|\n)MONGODB_URI=/m.test(text));
