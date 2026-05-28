import { cn } from "@/lib/utils";

type HomeHeroAnimatedBackgroundProps = {
  className?: string;
};

export function HomeHeroAnimatedBackground({
  className,
}: HomeHeroAnimatedBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="animate-home-gradient absolute inset-0" />
      <div className="animate-hero-float absolute -right-24 -top-20 h-[28rem] w-[28rem] rounded-full bg-white/50 blur-[90px] screen744:h-[32rem] screen744:w-[32rem]" />
      <div className="animate-hero-float-alt absolute -bottom-32 -left-24 h-[30rem] w-[30rem] rounded-full bg-primary1/20 blur-[90px] screen744:-bottom-40 screen744:h-[34rem] screen744:w-[34rem]" />
      <div className="animate-hero-shimmer absolute left-1/2 top-[32%] h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-white/40 blur-[80px] screen744:top-[36%] screen744:h-[24rem] screen744:w-[24rem]" />
      <div className="animate-hero-float absolute -right-20 top-[58%] h-[22rem] w-[22rem] rounded-full bg-secondary2/15 blur-[90px] screen744:h-[26rem] screen744:w-[26rem]" />
    </div>
  );
}
