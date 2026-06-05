"use client";

import { useEffect, useMemo, useState } from "react";
import { TQuestion } from "@/models/question.model";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";

export interface McqAiFeedback {
  summary: string;
  clbEstimate?: string;
  priorities: string[];
  studyTips: string[];
  nextStep: string;
}

interface PracticeAiMcqFeedbackProps {
  skill: "Reading" | "Listening";
  practiceId: string;
  taskName?: string;
  correct: number;
  total: number;
  wrong: number;
  notAnswered: number;
  questions: TQuestion[];
  selectedAnswers: Record<string, string>;
  passageExcerpt?: string;
}

function userAnswerFor(
  selectedAnswers: Record<string, string>,
  question: TQuestion,
  index: number
): string | undefined {
  return (
    selectedAnswers[index] ??
    selectedAnswers[String(index)] ??
    selectedAnswers[question.id]
  );
}

function cacheKey(
  practiceId: string,
  selectedAnswers: Record<string, string>
) {
  return `celpip_mcq_ai_${practiceId}_${JSON.stringify(selectedAnswers)}`;
}

export default function PracticeAiMcqFeedback(props: PracticeAiMcqFeedbackProps) {
  const { isLoaded, isSignedIn } = useHybridWebUser();
  const [feedback, setFeedback] = useState<McqAiFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payloadQuestions = useMemo(() => {
    return props.questions.map((q, index) => {
      const ua = userAnswerFor(props.selectedAnswers, q, index);
      const userChoice = q.choices.find((c) => c.id === ua);
      const correctChoice = q.choices.find((c) => c.id === q.answer);
      return {
        question: q.question ?? "",
        userAnswer: userChoice?.text,
        correctAnswer: correctChoice?.text ?? q.answer,
        isCorrect: ua !== undefined && ua === q.answer,
        explanation: q.description,
      };
    });
  }, [props.questions, props.selectedAnswers]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!props.practiceId || props.questions.length === 0) return;

    const key = cacheKey(props.practiceId, props.selectedAnswers);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setFeedback(JSON.parse(cached) as McqAiFeedback);
        return;
      }
    } catch {
      // ignore cache read errors
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/practice/mcq-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skill: props.skill,
        practiceId: props.practiceId,
        taskName: props.taskName,
        correct: props.correct,
        total: props.total,
        wrong: props.wrong,
        notAnswered: props.notAnswered,
        questions: payloadQuestions,
        passageExcerpt: props.passageExcerpt?.slice(0, 2000),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not load AI feedback");
        }
        return res.json() as Promise<McqAiFeedback>;
      })
      .then((data) => {
        if (cancelled) return;
        setFeedback(data);
        try {
          sessionStorage.setItem(key, JSON.stringify(data));
        } catch {
          // ignore cache write errors
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    props.practiceId,
    props.skill,
    props.taskName,
    props.correct,
    props.total,
    props.wrong,
    props.notAnswered,
    props.passageExcerpt,
    payloadQuestions,
    props.selectedAnswers,
    props.questions.length,
  ]);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="mt-[12px] rounded-[12px] border border-[#D6E6FF] bg-[#F0F6FF] px-[16px] py-[14px] text-[14px] text-[#37465C]">
        <span className="font-semibold text-[#212E42]">AI coach: </span>
        Sign in for personalized tips based on your wrong answers.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-[12px] rounded-[12px] border border-[#D6E6FF] bg-[#F0F6FF] px-[16px] py-[14px] text-[14px] text-[#76808F] animate-pulse">
        Generating personalized feedback…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-[12px] rounded-[12px] border border-[#FFDCC0] bg-[#FFF5EF] px-[16px] py-[14px] text-[14px] text-[#37465C]">
        AI feedback unavailable right now. Review the explanations below for each
        question.
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="mt-[12px] rounded-[12px] border border-[#D6E6FF] bg-[#F0F6FF] px-[16px] py-[14px]">
      <div className="flex items-center gap-2 mb-[10px]">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-[#316BFF]">
          AI coach
        </span>
        {feedback.clbEstimate && (
          <span className="text-[12px] rounded-full bg-white px-[10px] py-[2px] text-[#37465C] border border-[#D6E6FF]">
            Est. {feedback.clbEstimate}
          </span>
        )}
      </div>
      <p className="text-[14px] text-[#37465C] leading-relaxed mb-[12px]">
        {feedback.summary}
      </p>
      {feedback.priorities.length > 0 && (
        <div className="mb-[10px]">
          <div className="text-[13px] font-semibold text-[#212E42] mb-[6px]">
            Focus next
          </div>
          <ul className="list-disc pl-[18px] text-[14px] text-[#37465C] space-y-[4px]">
            {feedback.priorities.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.studyTips.length > 0 && (
        <div className="mb-[10px]">
          <div className="text-[13px] font-semibold text-[#212E42] mb-[6px]">
            Study tips
          </div>
          <ul className="list-disc pl-[18px] text-[14px] text-[#37465C] space-y-[4px]">
            {feedback.studyTips.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.nextStep && (
        <div className="text-[14px] text-[#212E42] font-medium pt-[8px] border-t border-[#D6E6FF]">
          Next step: {feedback.nextStep}
        </div>
      )}
    </div>
  );
}
