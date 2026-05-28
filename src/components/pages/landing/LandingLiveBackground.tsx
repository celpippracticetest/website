import { cn } from "@/lib/utils";

type LandingLiveBackgroundProps = {
  className?: string;
  fadeTop?: boolean;
  fadeBottom?: boolean;
};

export function LandingLiveBackground({
  className,
  fadeTop = false,
  fadeBottom = false,
}: LandingLiveBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          "bg-[radial-gradient(circle_at_100%_0%,rgba(49,107,255,0.14)_0%,transparent_42%),radial-gradient(circle_at_0%_55%,rgba(244,132,95,0.11)_0%,transparent_40%),radial-gradient(circle_at_85%_85%,rgba(49,107,255,0.08)_0%,transparent_35%),linear-gradient(180deg,#F2F6FF_0%,#E3EBFF_38%,#E8EEFF_62%,#F2F6FF_100%)]",
        )}
      />
      <div className="animate-hero-float absolute -right-24 -top-20 h-[28rem] w-[28rem] rounded-full bg-primary1/20 blur-[90px] screen744:h-[32rem] screen744:w-[32rem]" />
      <div className="animate-hero-float-alt absolute -bottom-32 -left-24 h-[30rem] w-[30rem] rounded-full bg-secondary2/16 blur-[90px] screen744:-bottom-40 screen744:h-[34rem] screen744:w-[34rem]" />
      <div className="animate-hero-shimmer absolute left-1/2 top-[32%] h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-success/10 blur-[80px] screen744:top-[36%] screen744:h-[24rem] screen744:w-[24rem]" />
      <div className="animate-hero-float absolute -right-20 top-[58%] h-[22rem] w-[22rem] rounded-full bg-primary1/12 blur-[90px] screen744:h-[26rem] screen744:w-[26rem]" />
      {fadeTop ? (
        <div className="absolute inset-x-0 top-0 z-[2] h-12 bg-gradient-to-b from-white via-white/60 to-transparent screen744:h-16" />
      ) : null}
      {fadeBottom ? (
        <div className="absolute inset-x-0 bottom-0 z-[2] h-12 bg-gradient-to-t from-white via-white/60 to-transparent screen744:h-16" />
      ) : null}
    </div>
  );
}
