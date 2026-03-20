import { useEffect, useRef } from "react";
import { safePlayMedia } from "@/lib/media";

interface AudioPlayerProps {
  audioUrl: string;
  maxPlays?: number;
  className?: string;
}

const QuestionPlayer = ({ audioUrl, maxPlays = 2, className }: AudioPlayerProps) => {
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
    <div className={"rounded-lg "+className}>
      <audio ref={audioRef} src={audioUrl} preload="auto" className="w-full" controls />
    </div>
  );
};

export default QuestionPlayer;
