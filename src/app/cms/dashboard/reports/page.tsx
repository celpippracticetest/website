import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
import PageClient from "./PageClient";

export const metadata = cmsPageSeo("/cms/dashboard/reports");

export default function Page() {
  return <PageClient />;
}
