"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { claimGuestMockAnswers } from "@/lib/guestMockAnswers";

/** After login, upload answers taken as a guest, then refresh the results. */
export default function ClaimGuestMockAnswers({ examId }: { examId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { listGuestMockAnswers } = await import("@/lib/guestMockAnswers");
      const pending = await listGuestMockAnswers(examId).catch(() => []);
      if (cancelled || pending.length === 0) return;
      setSaving(true);
      await claimGuestMockAnswers(examId);
      if (cancelled) return;
      router.refresh();
      setSaving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, router]);

  if (!saving) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#17161680] px-4">
      <div className="w-full max-w-[420px] rounded-[24px] bg-white px-6 py-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#4A7DFF] border-t-transparent" />
        <p className="text-[16px] font-semibold text-[#212E42]">
          Preparing your results
        </p>
        <p className="mt-2 text-[14px] text-[#76808F]">
          Saving your answers and scoring writing and speaking. This can take a
          minute.
        </p>
      </div>
    </div>
  );
}
