import { useEffect, useRef } from "react";
import { safePlayMedia } from "@/lib/media";

interface AudioPlayerProps {
  audioUrl: string;
  maxPlays?: number;
}

const AudioPlayer = ({ audioUrl, maxPlays = 2 }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    void safePlayMedia(audio, {
      onError: (error) => {
        console.error("Error playing audio:", error);
      },
    });

    return () => {
      audio.pause();
    };
  }, [audioUrl]);

  return (
    <div className="w-full rounded-lg">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        className="w-full"
        controls
      />
    </div>
  );
};

export default AudioPlayer;
