import { createUserDiscount } from "@/lib/client/user/createUserDiscount";
import { useExtraDiscountStore } from "@/store/useExtraDiscount.store";
import { useMutation } from "@tanstack/react-query";

export const useCreateDiscountCoupon = () => {
  const setCouponId = useExtraDiscountStore((s) => s.setCouponId);

  return useMutation({
    mutationFn: (userId: string) => createUserDiscount(userId),
    onSuccess: (data) => {
      if (data?.couponCode) {
        setCouponId(data.couponCode);
      }
      // If data is null, user already has a discount - silently handle it
    },
    onError: (error) => {
      // Only log actual errors, not "already has discount" cases
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("already has a discount")) {
        console.error("Failed to create coupon:", error);
      }
    },
  });
};
