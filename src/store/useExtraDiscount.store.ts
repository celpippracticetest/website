import { create } from "zustand";

interface ExtraDiscountState {
  showExtraDiscount: boolean;
  couponId: number | null;
  visibleHorizontalCoupon: boolean | null;
  setVisibleHorizontalCoupon: (visibleHorizontalCoupon: boolean) => void;
  setCouponId: (couponId: number) => void;
  setShowExtraDiscount: (showExtraDiscount: boolean) => void;
}

export const useExtraDiscountStore = create<ExtraDiscountState>((set) => ({
  couponId: null,
  setCouponId: (id: number) => set({ couponId: id }),
  showExtraDiscount: false,
  setShowExtraDiscount: (value) => set({ showExtraDiscount: value }),
  visibleHorizontalCoupon: false,
  setVisibleHorizontalCoupon: (value) =>
    set({ visibleHorizontalCoupon: value }),
}));
