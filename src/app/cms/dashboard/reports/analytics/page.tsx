import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
import PageClient from "./PageClient";

export const metadata = cmsPageSeo("/cms/dashboard/reports/analytics");

export default function Page() {
  return <PageClient />;
}
