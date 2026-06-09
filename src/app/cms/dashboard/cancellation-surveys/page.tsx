import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
import PageClient from "./PageClient";

export const metadata = cmsPageSeo("/cms/dashboard/cancellation-surveys");

export default function Page() {
  return <PageClient />;
}
