import React from "react";

const WordsLanding = () => {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-4xl mx-auto animate-in fade-in duration-700">
            <h1 className="text-[40px] screen744:text-[56px] font-bold text-[#212E42] leading-[1.1] mb-8 tracking-tight">
                Add words. Study smarter. Master them for the exam.
            </h1>
            <p className="text-[18px] screen744:text-[22px] text-[#76808F] leading-relaxed max-w-2xl">
                Add words as you practice, review them with smart flashcards, and master them before test day.
            </p>

            {/* Added subtle glow or background element if needed, though simple clean look matches the prompt */}
            <div className="mt-16 relative">
                {/* This could be a placeholder for a 'Start Practicing' button or similar call to action if the user wants it later */}
            </div>
        </div>
    );
};

export default WordsLanding;
