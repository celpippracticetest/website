"use client";

import React from "react";

/** Three scannable trust points (no infinite scroll) — keep claims verifiable. */
const TRUST_POINTS = [
  { text: "70,000+ learners", icon: "👥" as const },
  { text: "AI scoring & instant feedback", icon: "⚡" as const },
  { text: "No credit card to start", icon: "🔒" as const },
];

const TrustRibbon = () => {
  return (
    <div className="w-full bg-gradient-to-r from-primary1 via-primary2 to-secondary2 py-3.5 screen744:py-4 relative">
      <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none" />
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 screen1280:px-10">
        <ul
          className="flex flex-col screen744:flex-row screen744:flex-wrap items-center justify-center gap-2 screen744:gap-6 screen1280:gap-10 list-none m-0 p-0"
          role="list"
        >
          {TRUST_POINTS.map((item) => (
            <li
              key={item.text}
              className="text-white text-xs screen744:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 w-full screen744:w-auto text-center"
            >
              <span className="text-sm shrink-0" aria-hidden>
                {item.icon}
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TrustRibbon;
