import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
import PageClient from "./PageClient";

export const metadata = cmsPageSeo("/cms/dashboard/tasks");

export default function Page() {
  return <PageClient />;
}
