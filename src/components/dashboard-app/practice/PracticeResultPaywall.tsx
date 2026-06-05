"use client";

import WorkspacePremium from "@mui/icons-material/WorkspacePremium";

interface PracticeResultPaywallProps {
  locked: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
  tint?: string;
}

export default function PracticeResultPaywall({
  locked,
  onUpgrade,
  children,
  tint = "#ffffff",
}: PracticeResultPaywallProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}

      {/* Bottom half: blur + fade */}
      <div
        className="absolute inset-x-0 top-1/2 bottom-0 z-10 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div
          className="absolute inset-0 backdrop-blur-[6px]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 25%, black 55%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 25%, black 55%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${tint}99 30%, ${tint} 65%)`,
          }}
        />
      </div>

      {/* CTA sits in the lower half */}
      <div className="absolute inset-x-0 top-1/2 bottom-0 z-20 flex items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center max-w-[320px] rounded-[16px] border border-[#D6E6FF] bg-white/95 px-6 py-5 shadow-lg">
          <WorkspacePremium className="h-6 w-6 text-[#316BFF]" />
          <p className="text-[15px] font-semibold text-[#212E42]">
            You&apos;re seeing half of your AI feedback
          </p>
          <p className="text-[13px] text-[#76808F] leading-relaxed">
            Upgrade to Pro for the full breakdown — grammar fixes,
            improvements, and a model answer.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="flex h-[40px] min-w-[180px] items-center justify-center rounded-[24px] bg-[#4A7DFF] px-6 text-[14px] font-medium text-white hover:bg-[#316BFF] transition-colors"
          >
            Get Pro
          </button>
        </div>
      </div>
    </div>
  );
}
