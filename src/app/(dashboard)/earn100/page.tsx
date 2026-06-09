import Referral from "@/components/dashboard-new/Referral";
import { getDashboardLayoutAuthContext } from "@/lib/auth/web-session-server";
import { redirect } from "next/navigation";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/earn100");

export default async function UserRefferalPage() {
  const ctx = await getDashboardLayoutAuthContext();

  if (!ctx?.userId) {
    redirect("/sign-in");
  }

  try {
    return <Referral />;
  } catch (error) {
    console.error("Unexpected error in profile page:", error);
    redirect("/");
  }
}
