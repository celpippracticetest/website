"use client";

import Groups from "@mui/icons-material/Groups";
import { useRecentSignupsLiveStat } from "@/hooks/useRecentSignupsLiveStat";

export function PricingUrgencyBanner() {
  const { display } = useRecentSignupsLiveStat("127");

  return (
    <div className="mb-6 flex flex-row items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center shadow-sm sm:text-left">
      <Groups sx={{ color: "#D97706", fontSize: 22 }} className="shrink-0" aria-hidden />
      <p className="text-sm font-semibold text-amber-900">
        <span className="font-extrabold">{display}</span> people upgraded to Plus in the
        last 24 hours
      </p>
    </div>
  );
}
