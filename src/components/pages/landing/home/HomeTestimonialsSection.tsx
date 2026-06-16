"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

const Svg5Star = dynamic(() => import("../../../icons/5Star"), { ssr: false });

const studentReviews = [
  {
    name: "Ravi",
    comment:
      "The timed practice tests felt close to the real CELPIP format. That practice helped me manage stress and finish each section within the allotted time.",
    source: "bear_student.png",
  },
  {
    name: "Tatiana",
    comment:
      "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
    source: "Tatiana.png",
  },
  {
    name: "Carlos",
    comment:
      "Speaking practice and instant feedback helped me build confidence. My answers became more organized, and I knew what to work on before test day.",
    source: "Carlos.png",
  },
  {
    name: "Ahmed",
    comment:
      "The writing feedback helped me improve structure and coherence. After two weeks of focused practice, I felt much more prepared for the exam.",
    source: "Ahmed.png",
  },
  {
    name: "Sofia",
    comment:
      "I adored the way the feedback was individualized. It pointed out my weak points in writing and speaking, and I could notice clear improvement week by week.",
    source: "bear_student_tablet.png",
  },
  {
    name: "Li",
    comment:
      "The practice of speaking on this website is amazing. I practiced and listened to the high-score examples. It was so helpful.",
    source: "Li.png",
  },
  {
    name: "Mark",
    comment:
      "Honestly, the variety of practice questions kept me engaged. I enjoyed it and never got bored, and on the day of the test, everything was comfortable and familiar.",
    source: "bear.png",
  },
  {
    name: "Dalia",
    comment:
      "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
    source: "Dalia.png",
  },
] as const;

function ReviewCard({
  person,
  index,
  animate,
  variant,
}: {
  person: (typeof studentReviews)[number];
  index: number;
  animate: boolean;
  variant: "mobile" | "desktop";
}) {
  const baseAnimate = animate
    ? "translate-x-0 translate-y-0 opacity-100"
    : variant === "mobile"
      ? "-translate-x-full opacity-0"
      : "translate-y-10 opacity-0";

  const sizeClasses =
    variant === "mobile"
      ? "min-w-[280px] max-w-[316px] h-[230px]"
      : "h-[200px] w-full screen1280:h-[235px]";

  return (
    <article
      role="article"
      style={{ transitionDelay: `${index * 40}ms` }}
      className={`flex flex-col flex-shrink-0 bg-white p-4 shadow-[2px_2px_8px_0px_#212E4214] transition-all duration-300 ease-out hover:!shadow-[0px_10px_35px_0px_#212E421A] rounded-3xl ${sizeClasses} ${baseAnimate} transform`}
    >
      <div className="flex h-14 gap-2.5">
        <Image
          src={`/images/${person.source}`}
          alt={`Photo of ${person.name}`}
          width={48}
          height={48}
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium text-text1 screen1280:text-xl">
            {person.name}
          </h3>
          <span>
            <Svg5Star />
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs font-normal leading-[18px] text-text2 screen1280:text-base screen1280:leading-[23px]">
        {person.comment}
      </p>
    </article>
  );
}

export function HomeTestimonialsSection() {
  const [animate, setAnimate] = useState(false);
  const { ref: sectionRef, inView } = useInView({
    threshold: 0,
    rootMargin: "0px 0px 120px 0px",
  });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="testimonials-heading"
      className="relative overflow-hidden py-16 screen744:py-24"
    >
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 screen744:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center screen744:mb-14">
          <span className="mb-3 inline-block rounded-full bg-secondary6 px-3 py-1 text-xs font-semibold text-secondary2">
            Success Stories
          </span>
          <h2
            id="testimonials-heading"
            className="text-balance text-3xl font-extrabold text-text1 screen744:text-4xl"
          >
            Trusted by 70,000+{" "}
            <span className="text-secondary2">CELPIP Learners</span>
          </h2>
          <p className="mt-3 text-base text-text2 screen744:text-lg">
            Practice stories from test-takers using mock exams, skill drills, and AI feedback.
          </p>
        </div>

        <div className="flex w-full gap-4 overflow-x-auto px-1 pb-1 scrollbar-none screen744:hidden">
          {studentReviews.map((person, index) => (
            <ReviewCard
              key={person.name}
              person={person}
              index={index}
              animate={animate}
              variant="mobile"
            />
          ))}
        </div>

        <div className="hidden w-full grid-cols-2 gap-4 screen744:grid screen1280:grid-cols-3 screen1280:gap-6">
          {studentReviews.map((person, index) => (
            <ReviewCard
              key={person.name}
              person={person}
              index={index}
              animate={animate}
              variant="desktop"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
