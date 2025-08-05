import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { currentUser, auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { redirect } from "next/navigation";

export default async function UserProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  try {
    const userRepo = new CheckoutRepository(mongoClient);
    const prevCheckout = await userRepo.findLatestCheckoutByUserId(userId);

    return <Profile prevCheckout={prevCheckout} />;
  } catch (error) {
    console.error("Unexpected error in profile page:", error);
    redirect("/");
  }
}
