import React from "react";
import ExamSectionCard from "./ExamSectionCard";
import dynamic from "next/dynamic";
const SvgListening = dynamic(() => import("../../icons/Listening"), {
  ssr: false,
});
const SvgSpeaking = dynamic(() => import("../../icons/Speaking"), {
  ssr: false,
});
const SvgWriting = dynamic(() => import("../../icons/Writing"), { ssr: false });
const SvgReading = dynamic(() => import("../../icons/Reading"), { ssr: false });
const SvgMockExamsColorful = dynamic(
  () => import("../../icons/MockExamsColorful"),
  { ssr: false }
);

const ExamBox = () => {
  return (
    <section
      aria-labelledby="exam-section-heading"
      className="md:!mt-104 mx-auto  flex justify-center mt-32 gap-24"
    >
      {[
        {
          title: "Listening",
          icon: <SvgListening />,
          bgColor: "bg-primary5",
        },
        {
          title: "Speaking",
          icon: <SvgSpeaking />,
          bgColor: "bg-secondary5",
        },
        { title: "Writing", icon: <SvgWriting />, bgColor: "bg-success5" },
        { title: "Reading", icon: <SvgReading />, bgColor: "bg-error5" },
        {
          title: "Mock Exams",
          icon: <SvgMockExamsColorful />,
          bgColor: "bg-purple5",
        },
      ].map((exam, index) => (
        <ExamSectionCard
          key={index}
          title={exam.title}
          icon={exam.icon}
          bgColor={exam.bgColor}
        />
      ))}
    </section>
  );
};

export default ExamBox;
