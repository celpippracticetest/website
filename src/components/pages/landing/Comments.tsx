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
        "CELPIPPRACTICETEST.com made a huge difference for me. The speaking practice and instant feedback gave me confidence. I passed with 9 in all sections!",
      source: "Carlos.png",
    },
    {
      name: "Li Wei",
      comment:
        "The speaking section on this website is amazing. I recorded my answers and compared with high-score samples. It helped a lot.",
      source: "Li.png",
    },
    {
      name: "Tatiana Volkov",
      comment:
        "Simple and powerful. I used it for a month and improved in all 4 sections. The dashboard tracking my progress was a nice bonus.",
      source: "Tatiana.png",
    },
  ];
  const personsBottom = [
    {
      name: "Ahmed El-Sayed",
      comment:
        "I finally got CLB 9 in writing after using CELPIPPRACTICETEST.com for two weeks. The AI feedback was exactly what I needed to improve structure and coherence. Highly recommend it!",
      source: "Ahmed.png",
    },
    {
      name: "Dalia Haddad",
      comment:
        "So many useful strategies I learned from the reading section. The mock tests are challenging but realistic. Helped calm my anxiety.",
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
      className="flex mt-[40px] screen744:!mt-[80px]  screen1280:!mt-[104px] overflow-x-hidden overflow-y-hidden  flex-col max-w-[1440px] mx-auto h-[300px] screen744:!h-[600px] screen1280:!h-[700px]"
    >
      <h2
        id="comments-heading"
        className="text-center text-[24px] screen744:!text-[28px] screen1280:!text-[32px] px-[16px] text-text1  mx-auto font-medium"
      >
        Join 20,000+ Graduates Who Trust Us
      </h2>
      <div className="flex scrollbar-none screen744:!hidden mt-[40px] screen1280:!mt-[80px] px-[20px] screen1280:!px-[40px] overflow-x-auto gap-[16px] screen1280:!gap-[24px] w-full flex-nowrap justify-start h-[300px] screen744:!h-[600px] screen1280:!min-h-[700px]">
        {allPersons.map((person, index) => (
          <div
            key={index}
            role="article"
            style={{ transitionDelay: `${index * 100}ms` }}
            className={`flex flex-col flex-shrink-0 min-w-[280px] max-w-[316px] screen744:!max-w-[316px] h-[180px] screen744:!h-[200px] bg-white shadow-[2px_2px_8px_0px_#212E4214] hover:!shadow-[0px_10px_35px_0px_#212E421A] p-[16px] rounded-[24px] ${
              animate
                ? "translate-x-0 opacity-100"
                : `${
                    index % 2 === 0 ? "-translate-x-full" : "translate-x-full"
                  } opacity-0`
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
            <div className="text-text2 text-[16px]  leading-[100%] screen1280:!leading-[23px] screen1280:!text-[18px] font-normal mt-[16px]">
              {person.comment}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden screen744:!flex mt-[80px] h-[230px] screen1280:!h-[300px] scrollbar-none overflow-x-auto screen1280:!overflow-hidden  screen1280:!mt-[80px] px-[20px]  screen1280:!px-[40px] flex-shrink justify-start gap-[16px] screen1280:!gap-[24px] max-w-[1440px]  flex-nowrap screen1280:!justify-center mx-auto ">
        {personsTop.map((person, index) => (
          <div
            key={index}
            role="article"
            style={{ transitionDelay: `${index * 100}ms` }}
            className={`flex flex-col
            shadow-[2px_2px_8px_0px_#212E4214]
   hover:!shadow-[0px_10px_35px_0px_#212E421A] flex-shrink-0  screen1280:!flex-shrink p-[16px] rounded-[24px] w-full max-w-[340px] h-[200px] screen1280:!max-w-[437px] screen1280:!h-[235px]  bg-white ${
     animate
       ? "translate-x-0 opacity-100"
       : `${
           index % 2 === 0 ? "-translate-x-full" : "translate-x-full"
         } opacity-0`
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
            <div className="text-text2 text-[16px] leading-[100%]  screen1280:!leading-[23px] screen1280:!text-[18px] font-normal mt-[16px]">
              {person.comment}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[21px] hidden screen744:!-mt-[10px]  screen1280:!-mt-[50px]  screen744:!flex screen1280:!gap-[24px] max-w-[1440px] px-[40px]  flex-nowrap flex-shrink justify-center mx-auto ">
        {personsBottom.map((person, index) => (
          <div
            key={index}
            role="article"
            style={{ transitionDelay: `${index * 100}ms` }}
            className={`${
              index === 0
                ? "-rotate-[21.18deg] screen1280:!mr-[55px]"
                : "rotate-[14.22deg] screen1280:!mr-[130px]"
            }  flex flex-col
              flex-shrink-0
            shadow-[2px_2px_8px_0px_#212E4214]
   hover:!shadow-[0px_10px_35px_0px_#212E421A] p-[16px] rounded-[24px] w-full max-w-[340px] h-[200px] screen1280:!max-w-[437px] screen1280:!h-[235px]  bg-white ${
     animate
       ? "translate-x-0 opacity-100"
       : `${
           index % 2 === 0 ? "-translate-x-full" : "translate-x-full"
         } opacity-0`
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
            <div className="text-text2 text-[16px] leading-[100%]  screen1280:!leading-[23px] screen1280:!text-[18px] font-normal mt-[16px]">
              {person.comment}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Comments;
