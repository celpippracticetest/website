"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

import AnimatedIcon from "./AnimatedIcon";
import bookAnimation from "../icons/animated/book/book-in-book.json";
import articleAnimation from "../icons/animated/article/article-in-article.json";
import checkAnimation from "../icons/animated/check/check-in-reveal.json";
import SvgBook from "../icons/animated/book/Book";
import SvgArticle from "../icons/animated/article/Article";
import SvgCheck from "../icons/animated/check/Check";

const BottomNavigation = () => {
    const pathname = usePathname();
    const router = useRouter();

    const [practice, setPractice] = useState(false);
    const [mockTest, setMockTest] = useState(false);
    const isLearning = pathname.includes("/learning");

    useEffect(() => {
        if (
            pathname === "/practice-overview" ||
            pathname.includes("listening") ||
            pathname.includes("reading") ||
            pathname.includes("writing") ||
            pathname.includes("speaking")
        ) {
            setPractice(true);
            setMockTest(false);
        } else if (pathname === "/exam-overview" || pathname.includes("exams")) {
            setMockTest(true);
            setPractice(false);
        } else if (pathname.includes("/learning")) {
            setPractice(false);
            setMockTest(false);
        } else {
            setPractice(false);
            setMockTest(false);
        }
    }, [pathname]);

    // Vibration animation variants
    const vibrationVariants = {
        initial: { x: 0, scale: 1, opacity: 0 },
        animate: {
            x: [0, -4, 4, -4, 4, 0],
            scale: 1,
            opacity: 1,
            transition: { duration: 0.4, ease: "easeInOut" }
        }
    };

    return (
        <div
            className="fixed bottom-[16px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[400px] screen1280:!hidden"
            style={{ height: 70, pointerEvents: "none" }}
        >
            {/* White pill background */}
            <div className="absolute inset-0 w-full h-full bg-white rounded-full shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)]" />

            {/* Navigation items */}
            <div
                className="relative z-10 grid grid-cols-3 items-center justify-items-center h-full px-4"
                style={{ pointerEvents: "auto" }}
            >
                {/* Practice */}
                <Link
                    href="/practice-overview"
                    prefetch={true}
                    className="relative w-full h-full flex items-center justify-center"
                >
                    {practice && (
                        <motion.div
                            className="absolute w-[80px] h-[56px] bg-[#E8ECF4] rounded-full -z-10"
                            variants={vibrationVariants}
                            initial="initial"
                            animate="animate"
                        />
                    )}
                    <motion.div
                        key={practice ? "active" : "inactive"}
                        initial={practice ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                        animate={{ opacity: practice ? 1 : 0.6, scale: practice ? 1 : 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                        <div className="w-[24px] h-[24px]">
                            {practice ? (
                                <AnimatedIcon
                                    animationData={bookAnimation}
                                    isActive={true}
                                />
                            ) : (
                                <SvgBook />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                practice ? "text-black" : "text-[#37465C]"
                            )}
                        >
                            Practice
                        </span>
                    </motion.div>
                </Link>

                {/* Exams */}
                <div
                    className="relative w-full h-full flex items-center justify-center cursor-pointer"
                    onClick={() => router.push("/exam-overview")}
                >
                    {mockTest && (
                        <motion.div
                            className="absolute w-[80px] h-[56px] bg-[#E8ECF4] rounded-full -z-10"
                            variants={vibrationVariants}
                            initial="initial"
                            animate="animate"
                        />
                    )}
                    <motion.div
                        key={mockTest ? "active" : "inactive"}
                        initial={mockTest ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                        animate={{ opacity: mockTest ? 1 : 0.6, scale: mockTest ? 1 : 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="w-[24px] h-[24px]">
                            {mockTest ? (
                                <AnimatedIcon
                                    animationData={articleAnimation}
                                    isActive={true}
                                />
                            ) : (
                                <SvgArticle />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                mockTest ? "text-black" : "text-[#37465C]"
                            )}
                        >
                            Exams
                        </span>
                    </motion.div>
                </div>

                {/* Learnings */}
                <Link
                    href="/learning"
                    prefetch={true}
                    className="relative w-full h-full flex items-center justify-center"
                >
                    {isLearning && (
                        <motion.div
                            className="absolute w-[80px] h-[56px] bg-[#E8ECF4] rounded-full -z-10"
                            variants={vibrationVariants}
                            initial="initial"
                            animate="animate"
                        />
                    )}
                    <motion.div
                        key={isLearning ? "active" : "inactive"}
                        initial={isLearning ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                        animate={{ opacity: isLearning ? 1 : 0.6, scale: isLearning ? 1 : 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                        <div className="w-[24px] h-[24px]">
                            {isLearning ? (
                                <AnimatedIcon
                                    animationData={checkAnimation}
                                    isActive={true}
                                />
                            ) : (
                                <SvgCheck />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                isLearning ? "text-black" : "text-[#37465C]"
                            )}
                        >
                            Learnings
                        </span>
                    </motion.div>
                </Link>
            </div>
        </div>
    );
};

export default BottomNavigation;



