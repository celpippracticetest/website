"use client";

import { useCallback, useState } from "react";

export function usePricingNavModal() {
  const [open, setOpen] = useState(false);
  const openPricingModal = useCallback(() => setOpen(true), []);

  return { open, setOpen, openPricingModal };
}
