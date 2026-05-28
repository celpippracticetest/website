"use client";

import Link from "next/link";
import Shield from "@mui/icons-material/Shield";
import { cn } from "@/lib/utils";

type PricingMoneyBackGuaranteeCardProps = {
  className?: string;
  onRefundPolicyClick?: () => void;
};

export function PricingMoneyBackGuaranteeCard({
  className,
  onRefundPolicyClick,
}: PricingMoneyBackGuaranteeCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm md:px-10 md:py-10",
        className,
      )}
    >
      <Shield
        sx={{ fontSize: 48, color: "#10B981" }}
        className="mx-auto mb-4"
        aria-hidden
      />
      <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
        48-Hour Money-Back Guarantee
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Not satisfied? Request a full refund within 48 hours of your first purchase when
        usage stays within our published caps. See our{" "}
        <Link
          href="/refund-policy"
          className="font-semibold text-blue-700 underline underline-offset-2"
          onClick={onRefundPolicyClick}
        >
          Refund Policy
        </Link>{" "}
        for full terms.
      </p>
    </div>
  );
}
