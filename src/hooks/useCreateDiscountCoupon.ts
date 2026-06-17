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
    },
    onError: (error) => {
      console.error("Failed to create coupon:", error);
    },
  });
};
