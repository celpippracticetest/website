"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  readRememberedMockExamAttemptId,
  rememberMockExamAttemptId,
  sanitizeMockExamAttemptIdParam,
} from "@/lib/mockExamAttemptId";

/**
 * Keeps mock-exam `attemptId` stable across part switches and answer-key navigation.
 * Remembers the URL attempt, and restores it into the URL when a link dropped it.
 */
export function useEnsureMockExamAttemptId(examId: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlAttemptId = sanitizeMockExamAttemptIdParam(
    searchParams.get("attemptId"),
  );
  const [attemptId, setAttemptId] = useState<string | undefined>(urlAttemptId);

  useEffect(() => {
    if (!examId) return;

    if (urlAttemptId) {
      rememberMockExamAttemptId(examId, urlAttemptId);
      setAttemptId(urlAttemptId);
      return;
    }

    const remembered = readRememberedMockExamAttemptId(examId);
    if (!remembered) {
      setAttemptId(undefined);
      return;
    }

    setAttemptId(remembered);
    const params = new URLSearchParams(searchParams.toString());
    params.set("attemptId", remembered);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [examId, urlAttemptId, pathname, router, searchParams]);

  return attemptId;
}
