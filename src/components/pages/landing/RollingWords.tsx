import React from "react";

/**
 * Hover label used on every "Start Free Practice" button: each word rolls up
 * in order while an identical copy slides in from below.
 *
 * The parent button must carry the `group/start` class — the animation runs
 * on hover of that element.
 */
const RollingWords = ({ text }: { text: string }) => (
  <span className="inline-flex gap-[0.28em]">
    {text.split(" ").map((word, index) => (
      <span key={`${word}-${index}`} className="relative inline-flex overflow-hidden leading-[1.25]">
        <span
          style={{ transitionDelay: `${index * 60}ms` }}
          className="inline-block transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:-translate-y-full group-data-[play]/start:-translate-y-full motion-reduce:transition-none motion-reduce:group-hover/start:translate-y-0"
        >
          {word}
        </span>
        <span
          aria-hidden="true"
          style={{ transitionDelay: `${index * 60}ms` }}
          className="absolute inset-0 inline-block translate-y-full transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/start:translate-y-0 group-data-[play]/start:translate-y-0 motion-reduce:hidden"
        >
          {word}
        </span>
      </span>
    ))}
  </span>
);

export default RollingWords;
