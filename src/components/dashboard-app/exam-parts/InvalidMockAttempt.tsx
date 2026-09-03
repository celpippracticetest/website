"use client";

import Link from "next/link";

export default function InvalidMockAttempt() {
  return (
    <main className="flex min-h-[60vh] w-full flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[24px] font-semibold text-[#212E42]">
        This mock test attempt was not found
      </h1>
      <p className="mt-3 max-w-[420px] text-[16px] text-[#76808F]">
        The attempt ID in this link is invalid or does not exist. Start a new
        attempt from the exam overview.
      </p>
      <Link
        href="/exam-overview"
        className="mt-8 flex h-[40px] items-center rounded-[24px] bg-[#4A7DFF] px-6 text-[14px] text-white"
      >
        Back to exam overview
      </Link>
    </main>
  );
}
