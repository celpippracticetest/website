import { useListeningAudioPlayer } from "../hooks/useListeningAudioPlayer";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  maxPlays?: number;
}

const AudioPlayer = ({ audioUrl, maxPlays = 2 }: AudioPlayerProps) => {
  const { audioRef, isPlaying, playCount, isLoading, error, handlePlayPause } =
    useListeningAudioPlayer({ audioUrl, maxPlays });

  return (
    <div className="w-full rounded-lg">
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <Volume2 className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h4 className="font-medium text-[#212121]">Audio Recording</h4>
            <p className="text-[14px] text-[#424242]">Listen carefully and answer the question</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-[14px] text-[#424242] mb-1">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              <>Plays: {playCount}/{maxPlays}</>
            )}
          </div>
          <Button
            className={cn(
              "flex items-center", 
              isLoading ? "bg-gray-400 hover:bg-gray-400 cursor-wait" : "",
              error ? "bg-red-500 hover:bg-red-600" : "",
              !isLoading && !error && playCount >= maxPlays && !isPlaying ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            )}
            onClick={handlePlayPause}
            disabled={isLoading || (playCount >= maxPlays && !isPlaying) || !!error}
          >
            {isLoading ? (
              "Loading Audio..."
            ) : error ? (
              "Audio Error"
            ) : isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" /> {playCount === 0 ? "Play Audio" : "Play Again"}
              </>
            )}
          </Button>
        </div>
      </div> */}

      <audio
        src={audioUrl}
        preload="auto"
        className="w-full"
        controls
        autoPlay
      />
    </div>
  );
};

export default AudioPlayer;
