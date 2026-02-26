import type { Metadata } from "next";
import RefundRequests from "@/components/admin/RefundRequests";

export const metadata: Metadata = {
  title: "CMS Refund Requests | CELPIP Practice Test",
  description:
    "Review and monitor submitted refund requests in the CELPIP Practice Test CMS dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRefundRequestsPage() {
  return <RefundRequests />;
}
