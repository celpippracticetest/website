"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

import SvgPractice from "@/components/icons/Practice";
import SvgMockTestNavigation from "@/components/icons/MockTestNavigation";
import SvgLearning from "@/components/icons/Learning";

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

    return (
        <div
            className="fixed bottom-[16px] left-0 right-0 mx-auto max-w-[1440px] screen1280:px-[80px] px-[16px] screen744:w-[calc(100%-84px)] screen1280:!hidden"
            style={{ height: 82, pointerEvents: "none" }}
        >
            {/* White pill background */}
            <div className="absolute inset-0 w-full h-full bg-white rounded-full shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)]" />

            {/* Navigation items */}
            <div
                className="relative z-10 grid grid-cols-3 items-center justify-items-center gap-[24px] h-full"
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
                            layoutId="nav-pill"
                            className="absolute w-[70px] h-[65px] bg-[#E8ECF4] rounded-[20px] -z-10"
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />
                    )}
                    <motion.div
                        animate={{ opacity: practice ? 1 : 0.6, scale: practice ? 1 : 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                        <div className="flex items-center justify-center w-[24px] h-[24px]">
                            {practice ? (
                                <SvgPractice
                                    stroke="#316BFF"
                                    fill="#316BFF"
                                    className="text-[#316BFF]"
                                />
                            ) : (
                                <SvgPractice
                                    stroke="#37465C"
                                    fill="white"
                                    className="text-[#37465C]"
                                />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                practice ? "text-[#316BFF]" : "text-[#37465C]"
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
                            layoutId="nav-pill"
                            className="absolute w-[70px] h-[65px] bg-[#E8ECF4] rounded-[20px] -z-10"
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />
                    )}
                    <motion.div
                        animate={{ opacity: mockTest ? 1 : 0.6, scale: mockTest ? 1 : 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center gap-1"
                    >
                        <div className="flex items-center justify-center w-[24px] h-[24px]">
                            {mockTest ? (
                                <SvgMockTestNavigation
                                    stroke="#316BFF"
                                    fill="#316BFF"
                                    className="text-[#316BFF]"
                                />
                            ) : (
                                <SvgMockTestNavigation
                                    stroke="#37465C"
                                    fill="white"
                                    className="text-[#37465C]"
                                />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                mockTest ? "text-[#316BFF]" : "text-[#37465C]"
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
                            layoutId="nav-pill"
                            className="absolute w-[70px] h-[65px] bg-[#E8ECF4] rounded-[20px] -z-10"
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />
                    )}
                    <motion.div
                        animate={{ opacity: isLearning ? 1 : 0.6, scale: isLearning ? 1 : 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                    >
                        <div className="flex items-center justify-center w-[24px] h-[24px]">
                            {isLearning ? (
                                <SvgLearning
                                    stroke="#316BFF"
                                    fill="#316BFF"
                                    className="text-[#316BFF]"
                                />
                            ) : (
                                <SvgLearning
                                    stroke="#37465C"
                                    fill="white"
                                    className="text-[#37465C]"
                                />
                            )}
                        </div>
                        <span
                            className={clsx(
                                "text-xs",
                                isLearning ? "text-[#316BFF]" : "text-[#37465C]"
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
