import { redirect } from "next/navigation";

/** Sidebar linked here before a dedicated settings UI existed. */
export default function CmsSettingsPage() {
  redirect("/cms/dashboard");
}
