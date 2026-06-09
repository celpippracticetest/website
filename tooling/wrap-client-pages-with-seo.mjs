/**
 * Rename "use client" page.tsx → PageClient.tsx and add a server page wrapper with CMS SEO.
 * Usage: node tooling/wrap-client-pages-with-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** [pagePath relative to src/app, registry path] */
const TARGETS = [
  ["cms/dashboard/abandoned-cart-emails/page.tsx", "/cms/dashboard/abandoned-cart-emails"],
  ["cms/dashboard/blog/page.tsx", "/cms/dashboard/blog"],
  ["cms/dashboard/blog/keywords/page.tsx", "/cms/dashboard/blog/keywords"],
  ["cms/dashboard/cancellation-surveys/page.tsx", "/cms/dashboard/cancellation-surveys"],
  ["cms/dashboard/exam/page.tsx", "/cms/dashboard/exam"],
  ["cms/dashboard/league/page.tsx", "/cms/dashboard/league"],
  ["cms/dashboard/nurture-emails/page.tsx", "/cms/dashboard/nurture-emails"],
  ["cms/dashboard/plans/page.tsx", "/cms/dashboard/plans"],
  ["cms/dashboard/practice/page.tsx", "/cms/dashboard/practice"],
  ["cms/dashboard/profession-pages/page.tsx", "/cms/dashboard/profession-pages"],
  ["cms/dashboard/reminder-emails/page.tsx", "/cms/dashboard/reminder-emails"],
  ["cms/dashboard/reports/page.tsx", "/cms/dashboard/reports"],
  ["cms/dashboard/reports/analytics/page.tsx", "/cms/dashboard/reports/analytics"],
  ["cms/dashboard/reports/google-ads/page.tsx", "/cms/dashboard/reports/google-ads"],
  ["cms/dashboard/reports/home-ab/page.tsx", "/cms/dashboard/reports/home-ab"],
  ["cms/dashboard/reports/quick/page.tsx", "/cms/dashboard/reports/quick"],
  ["cms/dashboard/reports/search-console/page.tsx", "/cms/dashboard/reports/search-console"],
  ["cms/dashboard/reports/stripe/page.tsx", "/cms/dashboard/reports/stripe"],
  ["cms/dashboard/seo/internal-links/page.tsx", "/cms/dashboard/seo/internal-links"],
  ["cms/dashboard/tasks/page.tsx", "/cms/dashboard/tasks"],
  ["cms/dashboard/user-emails/page.tsx", "/cms/dashboard/user-emails"],
  ["cms/dashboard/users/page.tsx", "/cms/dashboard/users"],
  ["cms/dashboard/wiki/page.tsx", "/cms/dashboard/wiki"],
];

for (const [relPage, seoPath] of TARGETS) {
  const pageFile = path.join(ROOT, "src/app", relPage);
  const dir = path.dirname(pageFile);
  const clientFile = path.join(dir, "PageClient.tsx");

  if (!fs.existsSync(pageFile)) {
    console.warn("skip missing", relPage);
    continue;
  }

  const source = fs.readFileSync(pageFile, "utf8");
  if (!/^["']use client["'];/m.test(source)) {
    console.warn("skip not client", relPage);
    continue;
  }

  if (fs.existsSync(clientFile)) {
    console.warn("skip PageClient exists", relPage);
    continue;
  }

  fs.writeFileSync(clientFile, source, "utf8");

  const wrapper = `import { cmsPageSeo } from "@/lib/seo/cmsPageSeo";
import PageClient from "./PageClient";

export const metadata = cmsPageSeo("${seoPath}");

export default function Page() {
  return <PageClient />;
}
`;

  fs.writeFileSync(pageFile, wrapper, "utf8");
  console.log("wrapped", relPage);
}
