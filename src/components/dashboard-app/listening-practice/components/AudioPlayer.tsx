import React, { useRef, useState, useEffect } from "react";
import SvgMore from "@/components/icons/More";
import { SvgPause, SvgSpeaker, SvgTrianglePlay } from "@/components/icons";
export default function AudioPlayer({
  audioUrl,
}: {
  audioUrl: string | undefined;
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
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", update);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(true);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
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
      <audio ref={audioRef} src={audioUrl} autoPlay preload="metadata" />
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
