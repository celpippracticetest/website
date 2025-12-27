"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

import AnimatedIcon from "./AnimatedIcon";
import bookAnimation from "../icons/animated/book/book-in-book.json";
import articleAnimation from "../icons/animated/article/article-in-article.json";
import checkAnimation from "../icons/animated/check/check-in-reveal.json";

import bookHover from "../icons/animated/book/book-hover-book.json";
import articleHover from "../icons/animated/article/article-hover-article.json";
import checkHover from "../icons/animated/check/check-hover-pinch.json";

import SvgBook from "../icons/animated/book/Book";
import SvgArticle from "../icons/animated/article/Article";
import SvgCheck from "../icons/animated/check/Check";
import SvgVocabulary from "../icons/Vocabulary";

const DesktopNavigation = () => {
    const pathname = usePathname();

    const [practice, setPractice] = useState(false);
    const [mockTest, setMockTest] = useState(false);
    const isLearning = pathname.includes("/learning");
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

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

    const isWords = pathname === "/words" || pathname === "/dashboard/words";

    const navItems = [
        {
            label: "Practice",
            href: "/practice-overview",
            isActive: practice,
            animation: bookAnimation,
            hoverAnimation: bookHover,
            StaticIcon: SvgBook,
        },
        {
            label: "Exams",
            href: "/exam-overview",
            isActive: mockTest,
            animation: articleAnimation,
            hoverAnimation: articleHover,
            StaticIcon: SvgArticle,
        },
        {
            label: "Learning",
            href: "/learning",
            isActive: isLearning,
            animation: checkAnimation,
            hoverAnimation: checkHover,
            StaticIcon: SvgCheck,
        },
        {
            label: "Words",
            href: "/dashboard/words",
            isActive: isWords,
            animation: bookAnimation, // Placeholder animation
            hoverAnimation: bookHover, // Placeholder hover
            StaticIcon: SvgVocabulary,
        },
    ];

    return (
        <div className="hidden screen1280:!flex gap-[24px] shrink-0 items-center">
            {navItems.map((item) => {
                const isHovered = hoveredLabel === item.label;

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex gap-[8px] group items-center hover:!cursor-pointer relative"
                        onMouseEnter={() => setHoveredLabel(item.label)}
                        onMouseLeave={() => setHoveredLabel(null)}
                    >
                        <div className="relative w-[24px] h-[24px] flex items-center justify-center">
                            {item.isActive ? (
                                <AnimatedIcon
                                    animationData={item.animation}
                                    isActive={true}
                                />
                            ) : (
                                <>
                                    {/* Default Gray Icon - fades out on hover */}
                                    <div
                                        className={clsx(
                                            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                                            isHovered ? "opacity-0" : "opacity-100"
                                        )}
                                    >
                                        <item.StaticIcon className="text-[#76808F]" />
                                    </div>

                                    {/* Hover Animation - appears on hover */}
                                    <div
                                        className={clsx(
                                            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                                            isHovered ? "opacity-100" : "opacity-0"
                                        )}
                                    >
                                        {/* Always render but control visibility to avoid remount flickering if possible, 
                                            but AnimatedIcon resets on isActive change. 
                                            Here we want it to play when hovered. */}
                                        <AnimatedIcon
                                            animationData={item.hoverAnimation}
                                            isActive={isHovered}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <span
                            className={clsx(
                                "transition-colors duration-200",
                                item.isActive
                                    ? "text-black"
                                    : "text-[#76808F] group-hover:text-[#316BFF]"
                            )}
                        >
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
};

export default DesktopNavigation;
