"use client";

import React from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";

/**
 * Fades and lifts its content in the first time it scrolls into view, so every
 * homepage section enters the same way. Static under reduced motion.
 */
const Reveal = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra delay in ms, for staggering siblings. */
  delay?: number;
}) => {
  const { ref, inView } = useInView({ threshold: 0.12, triggerOnce: true });

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[18px]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Reveal;
