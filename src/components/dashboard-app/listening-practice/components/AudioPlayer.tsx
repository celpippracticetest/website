import React, { useRef, useState, useEffect } from "react";
import SvgMore from "@/components/icons/More";
import { SvgPause, SvgSpeaker, SvgTrianglePlay } from "@/components/icons";
import { safePlayMedia } from "@/lib/media";
export default function AudioPlayer({
  audioUrl,
  variant = "default",
}: {
  audioUrl: string | undefined;
  variant?: "default" | "official";
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleClickOutsideVolume(event: any) {
      if (volumeRef.current && !volumeRef.current.contains(event.target)) {
        setShowVolume(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideVolume);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideVolume);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener("loadedmetadata", onLoaded);
    const update = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", update);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isUnmounted = false;

    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    audio.load();

    if (!audioUrl) {
      return () => {
        isUnmounted = true;
        audio.pause();
      };
    }

    void safePlayMedia(audio, {
      onPlayStart: () => {
        if (!isUnmounted) {
          setIsPlaying(true);
        }
      },
      onError: (error) => {
        console.error("Error playing audio:", error);
      },
    });

    return () => {
      isUnmounted = true;
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void safePlayMedia(audio, {
      onPlayStart: () => {
        setIsPlaying(true);
      },
      onError: (error) => {
        console.error("Error playing audio:", error);
      },
    });
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  if (variant === "official") {
    const progressPercent =
      duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

    return (
      <div
        style={{
          width: "100%",
          maxWidth: "390px",
          minHeight: "105px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "22px 28px",
          border: "1px solid #D8DDE5",
          background: "#F7F8FA",
          color: "#5A6573",
          fontFamily:
            '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: "14px",
          lineHeight: "20px",
        }}
      >
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <div className="boxIcon" style={{ display: "flex", alignItems: "center" }}>
          <em
            className="play-icon"
            style={{
              width: "65px",
              height: "65px",
              borderRadius: "999px",
              background: "linear-gradient(180deg, #FCFDFE 0%, #E6EAF0 100%)",
              border: "1px solid #C4CCD6",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontStyle: "normal",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#B7B7B7",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 21.2V14.8H11.1L18 9V27L11.1 21.2H6Z"
                  fill="currentColor"
                />
                <path
                  d="M22.2 14.1C23.8 15.4 24.7 17.6 24.7 18C24.7 18.4 23.8 20.6 22.2 21.9"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <path
                  d="M25.9 11.4C28.1 13.3 29.3 16 29.3 18C29.3 20 28.1 22.7 25.9 24.6"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <path
                  d="M29.6 8.7C32.4 11.2 33.9 14.7 33.9 18C33.9 21.3 32.4 24.8 29.6 27.3"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </em>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: "180px" }}>
          <div
            style={{
              fontWeight: 500,
              color: "#5B6472",
              marginBottom: "8px",
            }}
          >
            Playing...
          </div>
          <div
            style={{
              width: "100%",
              height: "10px",
              borderRadius: "999px",
              backgroundColor: "#DCE2EA",
              overflow: "hidden",
            }}
          >
            <span
              className="progressbar-value"
              style={{
                display: "block",
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(180deg, #9FB9E6 0%, #7FA0D6 100%)",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-player max-w-[550px] relative flex items-center h-[60px] gap-[8px]  p-[24px] bg-[#F3F3F3] border border-[#D5D6D8] rounded-[40px]">
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-[0] right-[47px] mt-2 w-[250px] bg-white border rounded shadow-lg z-10"
        >
          <a
            href={audioUrl}
            download
            className="block px-4 py-2 hover:bg-gray-100"
          >
            Download
          </a>
          <div className="px-4 py-2">
            <label className="flex items-center justify-between">
              Play Speed
              <select
                value={playbackRate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPlaybackRate(v);
                  if (audioRef.current) audioRef.current.playbackRate = v;
                }}
                className="ml-2 border rounded px-2 py-1"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button onClick={togglePlay} className="btn-play shrink-0">
        {isPlaying ? <SvgPause /> : <SvgTrianglePlay />}
      </button>
      <div className="times shrink-0">
        {Math.floor(currentTime / 60)}:
        {("0" + Math.floor(currentTime % 60)).slice(-2)} /{" "}
        {Math.floor(duration / 60)}:
        {("0" + Math.floor(duration % 60)).slice(-2)}
      </div>
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={onSeek}
        className="slider"
      />
      <div className="flex items-center">
        <div ref={volumeRef} className="btn-volume relative shrink-0">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className="focus:outline-none cursor-pointer"
          >
            <SvgSpeaker />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={onVolumeChange}
            className={`volume-slider appearance-none cursor-pointer z-[9999] ${
              showVolume
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          />
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="cursor-pointer shrink-0"
        >
          <SvgMore />
        </button>
      </div>
    </div>
  );
}
