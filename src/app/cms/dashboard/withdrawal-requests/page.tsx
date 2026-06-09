import WithdrawalRequests from "@/components/admin/WithdrawalRequests";
import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";

export const metadata = cmsPageSeo("/cms/dashboard/withdrawal-requests");

export default function AdminWithdrawalRequestsPage() {
  return <WithdrawalRequests />;
}
