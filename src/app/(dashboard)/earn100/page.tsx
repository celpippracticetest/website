import Referral from "@/components/dashboard-new/Referral";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { redirect } from "next/navigation";

export default async function UserRefferalPage() {
  const hybridUser = await getHybridCurrentUser();
  const userId = hybridUser?.userId;

  if (!userId) {
    redirect("/");
  }

  try {
    return <Referral />;
  } catch (error) {
    console.error("Unexpected error in profile page:", error);
    redirect("/");
  }
}
