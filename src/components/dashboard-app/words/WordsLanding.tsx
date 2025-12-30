import React from "react";
import Image from "next/image";

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
            <div className="relative w-full flex flex-col screen1024:flex-row items-center justify-center gap-10 screen1024:gap-0 min-h-[500px]">

                {/* Background Glow 1: Between Card 1 and Card 2 */}
                <div
                    className="colored-bg absolute pointer-events-none  rounded-full hidden screen1024:block"
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
                <div className="relative w-[320px] screen744:w-[400px] aspect-[420/320] transition-transform hover:scale-105 duration-500 screen1024:translate-x-20">
                    <Image
                        src="/images/word-page/first.png"
                        alt="Add words as you practice"
                        fill
                        className="object-contain"
                    />
                </div>

                {/* Card 2 */}
                <div className="flex flex-col items-center screen1024:pb-[100px]">
                    <div className="relative w-[320px] screen744:w-[400px] aspect-[420/320] transition-transform hover:scale-105 duration-500 z-10">
                        <Image
                            src="/images/word-page/second.png"
                            alt="Study with smart flashcards"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="mt-5 text-center screen1024:flex flex-col hidden">
                        <h3 className="text-[#316BFF] text-[18px] font-bold mb-3">Study with smart flashcards</h3>
                        <p className="text-[#212E42] text-[12px] opacity-70 max-w-[320px] mx-auto">See definitions, pronunciation, and examples all in one place.</p>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="relative w-[320px] screen744:w-[400px] aspect-[420/320] transition-transform hover:scale-105 duration-500 screen1024:-translate-x-20">
                    <Image
                        src="/images/word-page/third.png"
                        alt="Master words that matter"
                        fill
                        className="object-contain"
                    />
                </div>

            </div>
        </div>
    );
};

export default WordsLanding;
