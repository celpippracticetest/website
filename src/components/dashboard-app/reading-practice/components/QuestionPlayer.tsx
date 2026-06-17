
import { useListeningAudioPlayer } from "../hooks/useListeningAudioPlayer";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  maxPlays?: number;
  className?: string;
}

const QuestionPlayer = ({ audioUrl, maxPlays = 2, className }: AudioPlayerProps) => {
  const {
    audioRef,
    isPlaying,
    playCount,
    isLoading,
    error,
    handlePlayPause
  } = useListeningAudioPlayer({ audioUrl, maxPlays });
  
  return (
    <div className={"rounded-lg "+className}>
      
      <audio src={audioUrl} preload="auto" className="w-full" controls autoPlay/>
    </div>
  );
};

export default QuestionPlayer;
