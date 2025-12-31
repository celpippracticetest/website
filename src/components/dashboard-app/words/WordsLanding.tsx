import React from "react";
import Image from "next/image";
import FirstImage from "@/images/word-page/first.png";
import SecondImage from "@/images/word-page/second.png";
import ThirdImage from "@/images/word-page/third.png";
import ArrowImage from "@/images/word-page/arrow.png";

const WordsLanding = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-[1280px] mx-auto animate-in fade-in duration-700 overflow-visible relative">
            {/* Headline Section */}
            <div className="max-w-4xl mb-20 text-center flex flex-col items-center">
                <h1 className="text-[40px] screen744:text-[52px] font-bold text-[#212E42] leading-[1.15] mb-8 tracking-tight">
                    Grow your CELPIP vocabulary for exam success.
                </h1>
                <p className="text-[18px] screen744:text-[22px] text-[#212E42] opacity-80 leading-relaxed max-w-3xl mx-auto font-medium">
                    Add new words as you practice, study them with smart flashcards, and master them for the CELPIP exam.
                </p>
            </div>

            {/* Illustration Section */}
            <div className="relative w-full flex flex-col screen1024:flex-row items-center justify-center gap-4 min-h-[500px]">

                {/* Background Glow 1: Between Card 1 and Card 2 */}
                <div
                    className="colored-bg absolute pointer-events-none rounded-full hidden screen1024:block"
                    style={{
                        width: '350px',
                        height: '700px',
                        backgroundColor: '#F27059',
                        opacity: 0.3,
                        filter: 'blur(150px)',
                        top: '50%',
                        left: '35%',
                        transform: 'translate(-50%, -50%)',
                    }}
                />

                {/* Background Glow 2: Between Card 2 and Card 3 */}
                <div
                    className="colored-bg absolute pointer-events-none rounded-full hidden screen1024:block"
                    style={{
                        width: '350px',
                        height: '700px',
                        backgroundColor: '#0DAA94',
                        opacity: 0.3,
                        filter: 'blur(150px)',
                        top: '50%',
                        left: '65%',
                        transform: 'translate(-50%, -50%)',
                    }}
                />

                {/* Card 1 */}
                <div className="relative inline-block">
                    <div className="w-[320px] screen744:w-[400px] h-auto z-10">
                        <Image
                            src={FirstImage}
                            alt="Study with smart flashcards"
                            className="w-full h-auto object-contain"
                            placeholder="blur"
                        />
                    </div>
                    <div className="absolute top-1/2 bottom-[-30px] screen1024:left-[calc(100%-6px)] -translate-y-1/2 w-[50px] h-auto z-10 pointer-events-none hidden screen1024:block">
                        <Image
                            src={ArrowImage}
                            alt="Arrow"
                            className="w-full h-auto object-contain"
                            placeholder="blur"
                        />
                    </div>
                    <div className="screen1024:hidden absolute left-1/2 -translate-x-1/2 screen744:-bottom-[38px] -bottom-[40px] w-[50px] h-auto z-10 pointer-events-none rotate-90">
                        <Image
                            src={ArrowImage}
                            alt="Arrow"
                            className="w-full h-auto object-contain"
                            placeholder="blur"
                        />
                    </div>
                </div>

                {/* Card 2 */}
                <div className="flex flex-col items-center screen1024:pb-[100px]">
                    <div className="relative inline-block">
                        <div className="w-[320px] screen744:w-[400px] h-auto z-10">
                            <Image
                                src={SecondImage}
                                alt="Study with smart flashcards"
                                className="w-full h-auto object-contain"
                                placeholder="blur"
                            />
                        </div>
                        <div className="absolute top-1/2 left-[calc(100%-6px)] -translate-y-1/2 w-[50px] h-auto z-10 pointer-events-none hidden screen1024:block">
                            <Image
                                src={ArrowImage}
                                alt="Arrow"
                                className="w-full h-auto object-contain"
                                placeholder="blur"
                            />
                        </div>
                        <div className="screen1024:hidden absolute left-1/2 -translate-x-1/2 screen744:-bottom-[38px] -bottom-[40px] w-[50px] h-auto z-10 pointer-events-none rotate-90 scale-y-[-1]">
                            <Image
                                src={ArrowImage}
                                alt="Arrow"
                                className="w-full h-auto object-contain"
                                placeholder="blur"
                            />
                        </div>
                    </div>
                    <div className="mt-5 text-center screen1024:flex flex-col hidden">
                        <h3 className="text-[#316BFF] text-[18px] font-bold mb-3">Study with smart flashcards</h3>
                        <p className="text-[#212E42] text-[12px] opacity-70 max-w-[320px] mx-auto">See definitions, pronunciation, and examples all in one place.</p>
                    </div>
                </div>



                {/* Card 3 */}
                <div className="w-[320px] screen744:w-[400px] h-auto transition-transform">
                    <Image
                        src={ThirdImage}
                        alt="Master words that matter"
                        className="w-full h-auto object-contain"
                        placeholder="blur"
                    />
                </div>


            </div>
        </div>
    );
};

export default WordsLanding;
