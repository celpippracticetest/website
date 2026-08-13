import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const t0 = Date.now();
const { listAdminUsersFromUserProfiles, userProfilesTableExists } = await import(
  "../src/lib/admin/adminUsersDataSource.ts"
);
const { getSql, closeSql } = await import("../src/lib/pg/pool.ts");
console.log("import_ms", Date.now() - t0);

const sql = getSql();
try {
  let t = Date.now();
  const has = await userProfilesTableExists(sql);
  console.log("profiles_exists", has, "ms", Date.now() - t);

  t = Date.now();
  const result = await listAdminUsersFromUserProfiles(sql, {
    search: "",
    page: 1,
    limit: 20,
    sortBy: "lastActivity",
    sortOrder: "desc",
    subscriptionStatus: "all",
  });
  console.log("list_ms", Date.now() - t, {
    totalCount: result.totalCount,
    rows: result.rows.length,
    first: result.rows[0]
      ? {
          id: result.rows[0]._id,
          email: result.rows[0].email,
          lastActivity: result.rows[0].lastActivity,
        }
      : null,
  });
} catch (e) {
  console.error("ERROR", e);
  process.exitCode = 1;
} finally {
  await closeSql();
}
