import PartnersDashboardClient from "./PartnersDashboardClient";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/partners/dashboard");

export default function PartnersDashboardPage() {
  return <PartnersDashboardClient />;
}
