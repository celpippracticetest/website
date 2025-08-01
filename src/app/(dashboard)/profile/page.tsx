import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";

export default async function UserProfilePage() {
  const user = await currentUser();

  const userRepo = new CheckoutRepository(mongoClient);

  

  const prevCheckout = await userRepo.findLatestCheckoutByUserId(
    user?.id || ""
  );

  

  return <Profile prevCheckout={prevCheckout} />;
}
