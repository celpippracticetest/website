import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { getSql } = await import("./src/lib/pg/pool.ts");
  const { listAdminUsersFromUserProfiles } = await import(
    "./src/lib/admin/adminUsersDataSource.ts"
  );

  const sql = getSql();
  const result = await listAdminUsersFromUserProfiles(sql, {
    search: "oliveranogic@gmail.com",
    page: 1,
    limit: 20,
    sortBy: "lastActivity",
    sortOrder: "desc",
    subscriptionStatus: "all",
  });

  const out = result.rows.map((r: any) => ({
    id: r._id,
    email: r.email,
    practiceAttempts: r.practiceAttempts,
    practiceCompletions: r.practiceCompletions,
    mockAttempts: r.mockAttempts,
    mockCompletions: r.mockCompletions,
    totalTokens: r.totalTokens,
    uniqueIpAddressesCount: r.uniqueIpAddressesCount,
    uniqueUserAgentsCount: r.uniqueUserAgentsCount,
    lastActivity: r.lastActivity,
    totalActivities: r.totalActivities,
  }));

  console.log("totalCount", result.totalCount);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
