import { redirect } from "next/navigation";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/cms/settings");

/** Sidebar linked here before a dedicated settings UI existed. */
export default function CmsSettingsPage() {
  redirect("/cms/dashboard");
}
