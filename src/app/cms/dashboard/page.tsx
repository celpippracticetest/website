import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import "chart.js/auto";
import mongoClient from "@/lib/mongodb";
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

export default async function CMSDashboard({
  searchParams,
}: Readonly<{
  searchParams: { tab?: string; page?: string; limit?: string };
}>) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "exams", label: "Exams" },
    { key: "users", label: "Users" },
    { key: "reports", label: "Reports" },
    { key: "settings", label: "Settings" },
  ] as const;
  const tabParam = (searchParams?.tab || "overview").toLowerCase();
  const normalizedTab = tabParam;
  const tab = tabs.some((t) => t.key === normalizedTab)
    ? normalizedTab
    : "overview";

  // Pagination parameters
  const page = parseInt(searchParams?.page || "1");
  const limit = parseInt(searchParams?.limit || "100"); // 100 records per page

  if (tabParam === "onboarding" || tabParam === "onboarding-new") {
    redirect(`/cms/dashboard/onboarding?page=${page}&limit=${limit}`);
  }

  let pendingRefundRequests: PendingRefundRequest[] = [];

  if (tab === "overview") {
    try {
      const pendingFromDefaultDb = await mongoClient
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
          : await mongoClient
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
        createdAt: item.createdAt || "",
      }));
    } catch (error) {
      console.error("Failed to load pending refund requests for overview:", error);
      pendingRefundRequests = [];
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
