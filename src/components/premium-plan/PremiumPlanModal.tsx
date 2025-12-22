"use client";
import React, { useEffect, useState } from "react";
import useStore from "@/store";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import PlanCard from "@/components/pages/landing/PlanCard";
import { usePlans } from "@/hooks/usePlans";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { SvgTeacher, SvgPresenceAbsence, SvgBot, SvgTaskSquare } from "@/components/icons";
import img1 from "@/images/attachment.png";
import img2 from "@/images/attachment2.png";
import img3 from "@/images/attachment3.png";
import img5 from "@/images/attachment5.png";
import img6 from "@/images/attachment6.png";
import img7 from "@/images/attachment7.png";
import img8 from "@/images/attachment8.png";
import img9 from "@/images/attachment9.png";
import SvgDiamond from "../icons/Diamond";

const Svg5Star = dynamic(() => import("@/components/icons/5Star"), { ssr: false });

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <span className="font-medium text-gray-800 text-sm md:text-base">{question}</span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {isOpen && (
                <div className="p-4 text-gray-600 text-sm bg-white border-t border-gray-100">
                    {answer}
                </div>
            )}
        </div>
    );
};

const TestimonialCard = ({ name, comment, source }: { name: string; comment: string; source: string }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 h-full">
            <div className="flex items-center gap-3">
                <Image
                    src={`/images/${source}`}
                    alt={name}
                    width={40}
                    height={40}
                    className="rounded-full"
                />
                <div>
                    <h4 className="font-bold text-sm text-gray-900">{name}</h4>
                    <Svg5Star />
                </div>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">{comment}</p>
        </div>
    );
};

const AvatarCarousel = () => {
    const avatars = [
        "Carlos.png", "Li.png", "Tatiana.png", "Ahmed.png", "Dalia.png"
    ];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % avatars.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [avatars.length]);

    const visibleAvatars = [
        avatars[currentIndex],
        avatars[(currentIndex + 1) % avatars.length],
        avatars[(currentIndex + 2) % avatars.length],
    ];

    return (
        <div className="flex -space-x-2 overflow-hidden w-[80px] h-8 relative">
            <AnimatePresence mode="popLayout">
                {visibleAvatars.map((src, i) => (
                    <motion.div
                        key={`${src}-${i}`}
                        initial={{ x: 20, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: -20, opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.5 }}
                        className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden shrink-0"
                        style={{ zIndex: 3 - i }}
                    >
                        <Image
                            src={`/images/${src}`}
                            alt="User Avatar"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const PremiumPlanModal = () => {
    const { isPremiumPlanModalOpen, setPremiumPlanModalState } = useStore();
    const { plans } = usePlans();

    useEffect(() => {
        if (isPremiumPlanModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isPremiumPlanModalOpen]);

    const testimonials = [
        {
            name: "Carlos Mendoza",
            comment: "CELPIPPRACTICETEST.com made my practice a revolutionary process. Practice in speaking and getting instant feedback increased my confidence level. I cleared with 9 in all sections!",
            source: "Carlos.png",
        },
        {
            name: "Li Wei",
            comment: "The practice of speaking on this website is amazing. I practiced and listened to the high-score examples. It was so helpful.",
            source: "Li.png",
        },
        {
            name: "Tatiana Volkov",
            comment: "Simple and efficient. Practiced for a month and improved in all 4 areas. Having the dashboard tracking my progress was a lovely addition.",
            source: "Tatiana.png",
        },
        {
            name: "Ahmed El-Sayed",
            comment: "I finally got CLB 9 in writing after doing 2 weeks of practice tests at CELPIPPRACTICETEST.com. The AI feedback was exactly what I needed to improve structure and coherence. I highly recommend it!",
            source: "Ahmed.png",
        },
        {
            name: "Dalia Haddad",
            comment: "So many useful tips that I learned from the reading section. Mock tests are challenging but true to life. Assisted to calm down fears.",
            source: "Dalia.png",
        },
    ];

    const faqs = [
        {
            question: "Where can one take a full CELPIP practice test free of charge online?",
            answer: "You can take a free full-length CELPIP practice test right here on CELPIPPracticetest.com. Simply sign up for a free account to access our sample test which includes Listening, Reading, Writing, and Speaking sections with AI-powered scoring.",
        },
        {
            question: "How exact are CELPIP practice tests compared to the real test?",
            answer: "Our simulations attempt to replicate the actual CELPIP test format and duration. With AI-based scoring, your scores reflect real exam performance, enabling you to better estimate your CLB levels.",
        },
        {
            question: "Will I get instant online CELPIP scores and feedback?",
            answer: "Yes! Our platform provides instant AI scoring and detailed feedback for all sections, including Speaking and Writing, so you can identify your strengths and weaknesses immediately.",
        },
        {
            question: "What are the best 4 skills on the CELPIP practice platform?",
            answer: "Our platform covers all 4 skills: Listening, Reading, Writing, and Speaking. We provide targeted practice and strategies for each skill to help you maximize your CLB score.",
        },
        {
            question: "Do your CELPIP mock tests simulate real exam settings?",
            answer: "Yes, our mock tests are designed to simulate the real exam environment, including strict timing and interface layout, to help you get comfortable with the test day experience.",
        },
        {
            question: "What do you offer on CELPIPPracticeTest.com?",
            answer: "We offer a comprehensive preparation suite including full-length mock exams, practice questions for individual skills, AI scoring and feedback, study guides, and performance tracking.",
        },
        {
            question: "Is CELPIP better than IELTS?",
            answer: "It depends on your personal preference. CELPIP is fully computer-delivered and uses Canadian English, which some test-takers find more relatable for Canadian immigration. IELTS offers both paper and computer options. We recommend trying a practice test for both to see which suits you better.",
        },
    ];

    return (
        <AnimatePresence>
            {isPremiumPlanModalOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 overflow-y-auto"
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-[#F4F7FF] w-full rounded-t-3xl shadow-2xl relative flex flex-col h-[90vh] overflow-hidden"
                    >

                        {/* Close Button */}
                        <button
                            onClick={() => setPremiumPlanModalState()}
                            className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1 p-6 md:p-10 custom-scrollbar">
                            <div className="max-w-5xl mx-auto w-full">
                                {/* Header Section */}
                                <div className="text-center mb-10">
                                    <div className="flex flex-row justify-center gap-1">
                                        <SvgDiamond className="-rotate-30" />
                                        <h3
                                            className="text-[32px] font-medium text-blue-950 mb-3 text-center leading-[100%] tracking-[0%]"
                                            style={{ fontFamily: 'Inter, sans-serif' }}
                                        >
                                            Choose Your Right Plan!
                                        </h3>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-gray-700 font-medium mb-8">
                                        <AvatarCarousel />
                                        <span>Trusted by 70k+ test-takers</span>
                                    </div>

                                    {/* Features Bar */}
                                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm font-medium text-gray-700 mb-10">
                                        <div className="flex items-center gap-2">
                                            <SvgPresenceAbsence /> 60 mock exams
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <SvgTeacher /> Guide & Tips
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <SvgTaskSquare /> 3,000+ sample tests
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <SvgBot /> Instant AI Feedback
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Cards */}
                                <div className="flex flex-wrap justify-center gap-6 mb-16">
                                    {plans.map((item, index) => (
                                        <div key={item._id || index} className="w-full md:w-[300px] lg:w-[320px]">
                                            <PlanCard
                                                id={index}
                                                title={item.title}
                                                type={item.type}
                                                oldPrice={item.oldPrice}
                                                price={item.price}
                                                discount={item.discount}
                                                buttonTitle={item.buttonTitle}
                                                features={item.features}
                                                icon={item.icon}
                                                iconWrapperColor={item.iconWrapperColor}
                                                isModal={true}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Trusted By Section */}
                                <div className="mb-16 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                                    <h3 className="text-xl md:text-2xl font-semibold text-blue-950 text-center md:text-left max-w-[300px]">Trusted by students from top universities</h3>
                                    <div className="flex flex-wrap justify-center md:justify-end gap-3 md:gap-4">
                                        {[img1, img2, img3, img5, img6, img7, img8, img9].map((src, index) => (
                                            <div
                                                key={index}
                                                className="relative bg-white p-2 rounded-xl border border-gray-100 w-14 h-14 flex items-center justify-center hover:-translate-y-1 transition-transform duration-300 cursor-pointer before:absolute before:inset-0 before:rounded-xl before:content-[''] before:transition-shadow before:duration-300 before:ease before:transform before:translate-z-[-1px] before:shadow-[6px_4px_16px_0px_#FC7A5066,_-6px_-4px_16px_0px_#4A7DFF66]"
                                            >
                                                <Image
                                                    src={src}
                                                    alt={`University logo ${index + 1}`}
                                                    width={40}
                                                    height={40}
                                                    className="w-full h-full object-contain relative z-10"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Testimonials Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                                    {testimonials.map((t, i) => (
                                        <TestimonialCard key={i} {...t} />
                                    ))}
                                </div>

                                {/* FAQs */}
                                <div className="w-full">
                                    <h3 className="text-2xl font-bold text-blue-950 mb-6 text-center">FAQs</h3>
                                    {faqs.map((faq, i) => (
                                        <FAQItem key={i} {...faq} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PremiumPlanModal;
