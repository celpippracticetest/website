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
    textToSpeak?: string;
    className?: string;
}

export default function AudioPlayerV2({ audioUrl, textToSpeak, className = "" }: AudioPlayerV2Props) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // TTS State
    const [isTTS, setIsTTS] = useState(false);

    useEffect(() => {
        // Determine mode
        if (audioUrl) {
            setIsTTS(false);
        } else if (textToSpeak) {
            setIsTTS(true);
        } else {
            setIsTTS(false); // Default or disabled
        }
    }, [audioUrl, textToSpeak]);

    useEffect(() => {
        if (isTTS) return;

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
    }, [isTTS]);

    // Handle TTS cleanup
    useEffect(() => {
        return () => {
            if (isTTS) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isTTS]);

    const togglePlay = () => {
        if (isTTS) {
            if (isPlaying) {
                window.speechSynthesis.cancel();
                setIsPlaying(false);
                setCurrentTime(0);
            } else {
                if (!textToSpeak) return;

                // Cancel any ongoing speech
                window.speechSynthesis.cancel();
                setCurrentTime(0);

                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = "en-US";
                utterance.rate = 0.9; // Slightly slower for clarity

                utterance.onend = () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                };

                utterance.onerror = () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                };

                // Track progress by character index
                utterance.onboundary = (event) => {
                    // We track charIndex for 'word' or 'sentence' boundaries
                    if (event.name === 'word' || event.name === 'sentence') {
                        setCurrentTime(event.charIndex);
                    }
                };

                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            }
        } else {
            const audio = audioRef.current;
            if (!audio) return;
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isTTS) return; // seeking not supported for simple TTS

        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Calculate percentage for progress bar gradient
    const progressPercent = isTTS
        ? (textToSpeak && textToSpeak.length > 0 ? (currentTime / textToSpeak.length) * 100 : 0)
        : (duration ? (currentTime / duration) * 100 : 0);

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

            <div className={`relative w-full h-4 flex items-center ${isTTS ? "cursor-not-allowed" : ""}`}>
                <input
                    type="range"
                    min={0}
                    max={isTTS ? (textToSpeak?.length || 100) : (duration || 100)}
                    value={currentTime}
                    onChange={onSeek}
                    disabled={isTTS}
                    className={`w-full absolute z-10 opacity-0 h-full ${isTTS ? "cursor-not-allowed" : "cursor-pointer"}`}
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
                {!isTTS && (
                    <div
                        className="absolute w-5 h-5 bg-[#0DAA94] rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100 ease-linear shadow-sm"
                        style={{ left: `calc(${progressPercent}% - 10px)` }} // -10px to center the 20px thumb
                    />
                )}
            </div>

            {/* Hidden audio element only rendered if we have a URL */}
            {audioUrl && <audio ref={audioRef} src={audioUrl} />}
        </div>
    );
}
