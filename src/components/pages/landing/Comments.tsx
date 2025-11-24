import dynamic from "next/dynamic";
import React from "react";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";

const Svg5Star = dynamic(() => import("../../icons/5Star"), { ssr: false });

const Comments = () => {
  const personsTop = [
    {
      name: "Carlos Mendoza",
      comment:
        "CELPIPPRACTICETEST.com made my practice a revolutionary process. Practice in speaking and getting instant feedback increased my confidence level. I cleared my with 9 in all sections!",
      source: "Carlos.png",
    },
    {
      name: "Li Wei",
      comment:
        "The practice of speaking on this website is amazing. I practiced and listened to the high-score examples. It was so helpful.",
      source: "Li.png",
    },
    {
      name: "Tatiana Volkov",
      comment:
        "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
      source: "Tatiana.png",
    },
  ];
  const personsBottom = [
    {
      name: "Ahmed El-Sayed",
      comment:
        "I finally got CLB 9 in writing after doing 2 weeks of practice tests at CELPIPPRACTICETEST.com. The AI feedback was exactly what I needed to improve structure and coherence. I highly recommend it!",
      source: "Ahmed.png",
    },
    {
      name: "Dalia Haddad",
      comment:
        "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
      source: "Dalia.png",
    },
    {
      name: "Dalia Haddad",
      comment:
        "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
      source: "Dalia.png",
    },
    {
      name: "Ravi",
      comment:
        "The timed practice tests were identical to the real test. That practice enabled me to manage stress and finish each section within the allotted time.",
      source: "Ahmed.png",
    },
    {
      name: "Sofia",
      comment:
        "I adored the way the feedback was individualized. It pointed out my weak points in writing and speaking, and I could notice clear improvement week by week.",
      source: "Dalia.png",
    },
    {
      name: "Mark",
      comment:
        "Honestly, the variety of practice questions kept me engaged. I enjoyed it and my never got bored, and on the day of the test, everything was comfortable and familiar.",
      source: "Dalia.png",
    },
  ];

  const allPersons = [...personsTop, ...personsBottom];
  const [animate, setAnimate] = useState(false);
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => setAnimate(true), 700);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="comments-heading"
      className="flex mt-[40px] screen744:!mt-[80px] screen1280:!mt-[104px] overflow-x-hidden overflow-y-hidden flex-col max-w-[1440px] mx-auto"
    >
      <h2
        id="comments-heading"
        className="text-center text-[24px] screen744:!text-[28px] screen1280:!text-[32px] px-[16px] text-text1 mx-auto font-medium"
      >
        Join 20,000+ Graduates Who Trust Us
      </h2>

      {/* Mobile View - Horizontal Scroll */}
      <div className="flex scrollbar-none screen744:!hidden mt-[40px] px-[20px] overflow-x-auto gap-[16px] w-full flex-nowrap justify-start">
        {allPersons.map((person, index) => (
          <div
            key={index}
            role="article"
            style={{ transitionDelay: `${index * 100}ms` }}
            className={`flex flex-col flex-shrink-0 min-w-[280px] max-w-[316px] h-[180px] bg-white shadow-[2px_2px_8px_0px_#212E4214] hover:!shadow-[0px_10px_35px_0px_#212E421A] p-[16px] rounded-[24px] ${animate
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
              } transition-all duration-700 ease-out transform`}
          >
            <div className="flex gap-[10px] h-[56px]">
              <div>
                <Image
                  src={`/images/${person.source}`}
                  alt={`Photo of ${person.name}`}
                  width={48}
                  height={48}
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <h3 className="text-text1 font-medium text-[18px]">
                  {person.name}
                </h3>
                <span>
                  <Svg5Star />
                </span>
              </div>
            </div>
            <div className="text-text2 text-[16px] leading-[100%] font-normal mt-[16px]">
              {person.comment}
            </div>
          </div>
        ))}
      </div>

      {/* Tablet & Desktop View - 3x3 Grid */}
      <div className="hidden screen744:!grid grid-cols-2 screen1280:!grid-cols-3 mt-[40px] screen1280:!mt-[80px] px-[20px] screen1280:!px-[40px] gap-[16px] screen1280:!gap-[24px] max-w-[1440px] mx-auto">
        {allPersons.map((person, index) => (
          <div
            key={index}
            role="article"
            style={{ transitionDelay: `${index * 100}ms` }}
            className={`flex flex-col shadow-[2px_2px_8px_0px_#212E4214] hover:!shadow-[0px_10px_35px_0px_#212E421A] p-[16px] rounded-[24px] w-full max-w-[340px] h-[200px] screen1280:!max-w-[437px] screen1280:!h-[235px] bg-white ${animate
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
              } transition-all duration-700 ease-out transform`}
          >
            <div className="flex gap-[10px] h-[56px]">
              <div>
                <Image
                  src={`/images/${person.source}`}
                  alt={`Photo of ${person.name}`}
                  width={48}
                  height={48}
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <h3 className="text-text1 font-medium text-[18px] screen1280:!text-[20px]">
                  {person.name}
                </h3>
                <span>
                  <Svg5Star />
                </span>
              </div>
            </div>
            <div className="text-text2 text-[16px] leading-[100%] screen1280:!leading-[23px] screen1280:!text-[18px] font-normal mt-[16px]">
              {person.comment}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Comments;
