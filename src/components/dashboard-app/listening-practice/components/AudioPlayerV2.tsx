import React, { useRef, useState, useEffect } from "react";
import SvgHeadphonePlay from "@/components/icons/HeadphonePlay";
import type { SVGProps } from "react";

// Simple pause icon wrapper to match the headphone style if needed, 
// or we can just use a standard pause icon. 
// For now, I'll use a standard pause icon but styled to match.
const PauseIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={props.className}
    >
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

interface AudioPlayerV2Props {
    audioUrl?: string;
    className?: string;
}

export default function AudioPlayerV2({ audioUrl, className = "" }: AudioPlayerV2Props) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onLoaded = () => setDuration(audio.duration);
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended", onEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Calculate percentage for progress bar gradient
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex items-center gap-6 border border-[#0DAA94] rounded-full px-5 py-3 bg-white w-full max-w-[600px] ${className}`}>
            <button
                onClick={togglePlay}
                className="text-[#0DAA94] hover:text-[#0b8c7a] transition-colors shrink-0 outline-none focus:ring-2 ring-[#0daa94]/20 rounded-full"
                type="button"
            >
                {isPlaying ? (
                    // Using a consistent size and style
                    <PauseIcon className="w-6 h-6" />
                ) : (
                    <SvgHeadphonePlay className="w-6 h-6" />
                )}
            </button>

            <div className="relative w-full h-4 flex items-center">
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={onSeek}
                    className="w-full absolute z-10 opacity-0 cursor-pointer h-full"
                />

                {/* Custom Track */}
                <div className="w-full h-[12px] bg-gray-200 rounded-full overflow-hidden relative">
                    {/* Filled part */}
                    <div
                        className="h-full bg-[#A0F0E6] rounded-l-full absolute top-0 left-0 transition-all duration-100 ease-linear"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Custom Thumb - visual only, follows calculated position */}
                <div
                    className="absolute w-5 h-5 bg-[#0DAA94] rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100 ease-linear shadow-sm"
                    style={{ left: `calc(${progressPercent}% - 10px)` }} // -10px to center the 20px thumb
                />
            </div>

            <audio ref={audioRef} src={audioUrl} />
        </div>
    );
}
