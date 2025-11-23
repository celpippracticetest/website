"use client";

import React, { useState } from "react";
import { SkillPageContent } from "@/data/skill-pages-content";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

import dynamic from "next/dynamic";
import ExamSectionCard from "../pages/landing/ExamSectionCard";

// Icons
const SvgListening = dynamic(() => import("../icons/Listening"), { ssr: false });
const SvgSpeaking = dynamic(() => import("../icons/Speaking"), { ssr: false });
const SvgWriting = dynamic(() => import("../icons/Writing"), { ssr: false });
const SvgReading = dynamic(() => import("../icons/Reading"), { ssr: false });
const SvgMockExamsColorful = dynamic(() => import("../icons/MockExamsColorful"), { ssr: false });
const SvgLearning = dynamic(() => import("../icons/Learning"), { ssr: false });

interface SkillLandingPageProps {
    content: SkillPageContent;
    skillType: "listening" | "reading" | "writing" | "speaking";
    availableTasks?: { id: string; taskNumber: string }[];
}

const SkillLandingPage: React.FC<SkillLandingPageProps> = ({
    content,
    skillType,
    availableTasks = [],
}) => {
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };



    const getBeaverImage = () => {
        // Using a placeholder or existing image if available. 
        // Ideally this should be dynamic or passed as prop if different per skill.
        // For now, we'll use a generic placeholder or try to find one in the project.
        return "/images/beaver-mascot.png"; // Assuming this exists or will be added
    };

    return (
        <div className="w-full bg-[#F2F6FF] min-h-screen pb-[120px]">
            {/* Hero Section */}
            <div className="max-w-[1200px] mx-auto px-4 pt-8">
                <div className="flex items-center gap-2 mb-8">
                    {/* Breadcrumbs or Header if needed */}
                </div>

                <h1 className="text-[32px] font-bold text-[#212E42] mb-8">
                    {content.title}
                </h1>

                {/* Tasks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
                    {content.tasks.map((task, index) => {
                        // Match real task by taskNumber (e.g. "Task 1" -> "1")
                        const realTask = availableTasks.find(t => {
                            const num = t.taskNumber.replace(/\D/g, "");
                            return num === task.id;
                        });

                        const href = realTask
                            ? `/${skillType}?taskId=${realTask.id}`
                            : `/${skillType}?taskId=${task.id}`; // Fallback

                        return (
                            <Link
                                key={task.id}
                                href={href}
                                className="bg-[#FFF9F0] border border-[#FFEBD6] rounded-xl p-6 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <span className="text-[#76808F] text-sm font-medium">
                                    {task.title}
                                </span>
                                <span className="text-[#212E42] text-lg font-semibold">
                                    {task.description}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* Content Section with Mascot */}
                <div className="flex flex-col lg:flex-row gap-12 items-start mb-16">
                    <div className="flex-1">
                        <h2 className="text-[24px] font-bold text-[#212E42] mb-4">
                            Start Your CELPIP {content.title.split(" ")[0]} Practice
                        </h2>
                        <p className="text-[#525D6F] mb-8 leading-relaxed">
                            {content.description}
                        </p>

                        <h3 className="text-[18px] font-bold text-[#212E42] mb-3">
                            {content.tipsTitle}
                        </h3>
                        <p className="text-[#525D6F] mb-4">
                            It&apos;s not just about sitting down for the tests; it&apos;s also how you
                            practice. Here are some tips on how to improve your score:
                        </p>
                        <ul className="list-disc pl-5 text-[#525D6F] mb-8 space-y-2">
                            {content.tips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                            ))}
                        </ul>

                        <h3 className="text-[18px] font-bold text-[#212E42] mb-3">
                            {content.format.title}
                        </h3>
                        <p className="text-[#525D6F] mb-4">{content.format.description}</p>
                        <ul className="list-disc pl-5 text-[#525D6F] space-y-2">
                            {content.format.points.map((point, idx) => (
                                <li key={idx}>{point}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Mascot Image */}
                    <div className="hidden lg:block w-[300px] shrink-0">
                        {/* Placeholder for the beaver mascot image from the design */}
                        <div className="w-full h-[300px] bg-contain bg-no-repeat bg-center" style={{ backgroundImage: `url(${getBeaverImage()})` }}></div>
                    </div>
                </div>

                {/* FAQs */}
                <div className="mb-16">
                    <h2 className="text-[24px] font-bold text-[#212E42] mb-6">FAQs</h2>
                    <div className="space-y-4">
                        {content.faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-xl border border-[#D5D6D8] overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-[#212E42] font-medium">
                                        {faq.question}
                                    </span>
                                    {openFaqIndex === index ? (
                                        <ChevronUp className="text-[#76808F] w-5 h-5" />
                                    ) : (
                                        <ChevronDown className="text-[#76808F] w-5 h-5" />
                                    )}
                                </button>
                                {openFaqIndex === index && (
                                    <div className="px-6 pb-4 text-[#525D6F] text-sm">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Navigation Cards */}

                <div className="flex flex-wrap screen1280:flex-nowrap gap-[16px] screen1280:gap-[24px] w-full max-w-[1440px] mx-auto justify-center z-0 relative">
                    {[
                        {
                            title: "Listening",
                            icon: <SvgListening />,
                            bgColor: "bg-primary5",
                            link: "/listening",
                        },
                        {
                            title: "Speaking",
                            icon: <SvgSpeaking />,
                            bgColor: "bg-secondary5",
                            link: "/speaking",
                        },
                        {
                            title: "Writing",
                            icon: <SvgWriting />,
                            bgColor: "bg-success5",
                            link: "/writing",
                        },
                        {
                            title: "Reading",
                            icon: <SvgReading />,
                            bgColor: "bg-error5",
                            link: "/reading",
                        },
                        {
                            title: "Mock Exams",
                            icon: <SvgMockExamsColorful />,
                            bgColor: "bg-purple5",
                            link: "/exam-overview",
                        },
                        {
                            title: "Learning",
                            icon: <SvgLearning />,
                            bgColor: "bg-[#FEF9C3]",
                            link: "/learning",
                        },
                    ]
                        .filter((item) => item.link !== `/${skillType}`)
                        .map((exam, index, array) => (
                            <ExamSectionCard
                                key={index}
                                title={exam.title}
                                icon={exam.icon}
                                bgColor={exam.bgColor}
                                isLast={index === array.length - 1}
                                link={exam.link}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
};

export default SkillLandingPage;
