import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import "chart.js/auto";
import documentsClient from "@/lib/appDocumentsClient";
import {
  countActiveChallenges,
  loadChallengeAcceptances,
  type ChallengeAcceptanceRow,
} from "@/lib/cms/challengeAcceptances";
import { Box } from "@/components/ui/Box";

export const metadata: Metadata = {
  title: "CMS Dashboard",
};

type PendingRefundRequest = {
  _id: string;
  trackingCode: string;
  fullName: string;
  email: string;
  createdAt: Date | string;
};

function coerceRefundCreatedAt(value: unknown): Date | string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  return "";
}

export default async function CMSDashboard({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    tab?: string;
    page?: string;
    limit?: string;
    challenge_page?: string;
    challenge_limit?: string;
  }>;
}>) {
  const sp = await searchParams;
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "exams", label: "Exams" },
    { key: "users", label: "Users" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
  ] as const;
  const tabParam = (sp.tab || "overview").toLowerCase();
  const normalizedTab = tabParam;
  const tab = tabs.some((t) => t.key === normalizedTab)
    ? normalizedTab
    : "overview";

  // Pagination parameters
  const page = parseInt(sp.page || "1");
  const limit = parseInt(sp.limit || "100"); // 100 records per page

  if (tabParam === "onboarding" || tabParam === "onboarding-new") {
    redirect(`/cms/dashboard/onboarding?page=${page}&limit=${limit}`);
  }

  let pendingRefundRequests: PendingRefundRequest[] = [];
  let challengeReport: {
    total: number;
    rows: ChallengeAcceptanceRow[];
    activeCount: number;
  } = { total: 0, rows: [], activeCount: 0 };
  const challengePage = Math.max(1, parseInt(sp.challenge_page || "1", 10) || 1);
  const challengeLimit = Math.min(
    100,
    Math.max(1, parseInt(sp.challenge_limit || "25", 10) || 25),
  );

  if (tab === "overview") {
    try {
      const pendingFromDefaultDb = await documentsClient
        .db()
        .collection("refundRequests")
        .find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          _id: 1,
          trackingCode: 1,
          fullName: 1,
          email: 1,
          createdAt: 1,
        })
        .toArray();

      const pendingFromProdDb =
        pendingFromDefaultDb.length > 0
          ? []
          : await documentsClient
              .db("prod")
              .collection("refundRequests")
              .find({ status: "pending" })
              .sort({ createdAt: -1 })
              .limit(10)
              .project({
                _id: 1,
                trackingCode: 1,
                fullName: 1,
                email: 1,
                createdAt: 1,
              })
              .toArray();

      const source = pendingFromDefaultDb.length > 0 ? pendingFromDefaultDb : pendingFromProdDb;
      pendingRefundRequests = source.map((item) => ({
        _id: String(item._id),
        trackingCode: String(item.trackingCode || ""),
        fullName: String(item.fullName || ""),
        email: String(item.email || ""),
        createdAt: coerceRefundCreatedAt(
          (item as { createdAt?: unknown }).createdAt
        ),
      }));
    } catch (error) {
      console.error("Failed to load pending refund requests for overview:", error);
      pendingRefundRequests = [];
    }

    try {
      const loadFrom = async (db: ReturnType<typeof documentsClient.db>) => {
        const [pack, activeCount] = await Promise.all([
          loadChallengeAcceptances(db, challengePage, challengeLimit),
          countActiveChallenges(db),
        ]);
        return { ...pack, activeCount };
      };

      let pack = await loadFrom(documentsClient.db());
      if (pack.total === 0) {
        pack = await loadFrom(documentsClient.db("prod"));
      }
      challengeReport = pack;
    } catch (error) {
      console.error("Failed to load challenge acceptances for overview:", error);
    }
  }

  return (
    <div className="w-full">
      {/* Content area */}
      {tab === "overview" && (
        <Box className="flex w-full flex-col gap-[16px]">
          <Box className="rounded-[12px] border border-[#E5E7EB] bg-white p-[16px]">
            <h2 className="text-[20px] font-semibold text-[#111827]">Items That Need Attention</h2>
            <p className="mt-[4px] text-[14px] text-[#6B7280]">
              Pending refund requests that require review.
            </p>

            <Box className="mt-[12px] overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              {pendingRefundRequests.length === 0 ? (
                <Box className="p-[12px] text-[14px] text-[#6B7280]">
                  No pending refund requests.
                </Box>
              ) : (
                <Box className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="border-b bg-[#F9FAFB]">
                      <tr>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Tracking
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Name
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Email
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRefundRequests.map((item) => (
                        <tr key={item._id} className="border-b last:border-b-0">
                          <td className="px-[12px] py-[10px] text-[13px] font-semibold text-[#1F2937]">
                            {item.trackingCode}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.fullName}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">{item.email}</td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>

            <Box className="mt-[10px]">
              <Link
                href="/cms/dashboard/refund-requests"
                className="text-[14px] font-medium text-blue-600 hover:text-blue-800"
              >
                Open full refund requests list
              </Link>
            </Box>
          </Box>

          <Box
            id="challenge-report"
            className="rounded-[12px] border border-[#E5E7EB] bg-white p-[16px]"
          >
            <h2 className="text-[20px] font-semibold text-[#111827]">
              Post-onboarding refund challenge
            </h2>
            <p className="mt-[4px] text-[14px] text-[#6B7280]">
              Users who enrolled from the final-offer challenge flow (<code className="text-[13px]">
                challenge_offer_source: final_offer
              </code>
              ). Data lives in <code className="text-[13px]">users.challenge</code>.
            </p>

            <Box className="mt-[12px] flex flex-wrap gap-[16px] text-[14px]">
              <Box className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="text-[12px] font-semibold uppercase text-[#6B7280]">Total accepted</div>
                <div className="text-[22px] font-semibold text-[#111827]">{challengeReport.total}</div>
              </Box>
              <Box className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="text-[12px] font-semibold uppercase text-[#6B7280]">Active now</div>
                <div className="text-[22px] font-semibold text-[#111827]">
                  {challengeReport.activeCount}
                </div>
              </Box>
            </Box>

            <Box className="mt-[12px] overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              {challengeReport.rows.length === 0 ? (
                <Box className="p-[12px] text-[14px] text-[#6B7280]">
                  No challenge acceptances found in the connected database.
                </Box>
              ) : (
                <Box className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead className="border-b bg-[#F9FAFB]">
                      <tr>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          User ID
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Email
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Mode
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Status
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Target CLB
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Window (days)
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Refund %
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Offer
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Tier
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Started
                        </th>
                        <th className="px-[12px] py-[10px] text-left text-[12px] font-semibold uppercase text-[#6B7280]">
                          Deadline
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {challengeReport.rows.map((row) => (
                        <tr key={row.clerkUserId} className="border-b last:border-b-0">
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            {row.clerkUserId ? (
                              <Link
                                href={`/cms/dashboard/users/${encodeURIComponent(row.clerkUserId)}`}
                                className="font-medium text-blue-600 hover:text-blue-800"
                              >
                                {row.clerkUserId}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#1F2937]">
                            {row.email ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.mode ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.status ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.targetClb ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.windowDays ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.refundPercent != null ? `${row.refundPercent}%` : "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.offerSource ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] font-mono text-[12px] text-[#4B5563]">
                            {row.tierKey ?? "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.startsAt ? new Date(row.startsAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-[12px] py-[10px] text-[13px] text-[#4B5563]">
                            {row.deadlineAt ? new Date(row.deadlineAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>

            {challengeReport.total > 0 ? (
              <Box className="mt-[12px] flex flex-wrap items-center gap-[12px] text-[14px] text-[#4B5563]">
                <span>
                  Page {challengePage} of{" "}
                  {Math.max(1, Math.ceil(challengeReport.total / challengeLimit))} ({challengeReport.total}{" "}
                  total)
                </span>
                <div className="flex flex-wrap gap-[8px]">
                  {challengePage > 1 ? (
                    <Link
                      className="font-medium text-blue-600 hover:text-blue-800"
                      href={`/cms/dashboard?tab=overview&challenge_page=${challengePage - 1}&challenge_limit=${challengeLimit}`}
                    >
                      Previous
                    </Link>
                  ) : null}
                  {challengePage <
                  Math.max(1, Math.ceil(challengeReport.total / challengeLimit)) ? (
                    <Link
                      className="font-medium text-blue-600 hover:text-blue-800"
                      href={`/cms/dashboard?tab=overview&challenge_page=${challengePage + 1}&challenge_limit=${challengeLimit}`}
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </Box>
            ) : null}
          </Box>
        </Box>
      )}

      {tab === "exams" && (
        <div className="text-sm text-gray-700">Exams module goes here.</div>
      )}

      {tab === "users" && (
        <div className="text-sm text-gray-700">Users module goes here.</div>
      )}

      {tab === "reports" && (
        <div className="text-sm text-gray-700">
          <Link
            href="/cms/dashboard/reports"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View marketing and analytics reports
          </Link>
          {" "}(real-time, 24h, 7d, 30d, 90d).
        </div>
      )}

      {tab === "settings" && (
        <div className="text-sm text-gray-700">Settings module goes here.</div>
      )}
    </div>
  );
}
