import Referral from "@/components/dashboard-new/Referral";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function UserRefferalPage() {
  const { userId } = await auth();

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
