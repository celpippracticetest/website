
import { useState, useRef, useEffect } from "react";
import { safePlayMedia } from "@/lib/media";

interface UseListeningAudioPlayerProps {
  audioUrl: string;
  maxPlays?: number;
}

export const useListeningAudioPlayer = ({ audioUrl, maxPlays = 2 }: UseListeningAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Initialize audio element
    if (audioRef.current) {
      // Add event listeners
      audioRef.current.addEventListener('ended', handleAudioEnded);
      audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
      audioRef.current.addEventListener('error', handleAudioError);
      
      // Try to load the audio
      audioRef.current.load();
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
        audioRef.current.removeEventListener('error', handleAudioError);
      }
    };
  }, [audioUrl]);
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  const handleCanPlayThrough = () => {
    setIsLoading(false);
  };
  
  const handleAudioError = (e: Event) => {
    setIsLoading(false);
    setError("Failed to load audio. Please try again later.");
    console.error("Audio error:", e);
  };
  
  const handlePlayPause = () => {
    if (!audioRef.current || error) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (playCount >= maxPlays) {
        return; // Max plays reached
      }

      void safePlayMedia(audioRef.current, {
        onPlayStart: () => {
          setIsPlaying(true);
          setPlayCount((prev) => prev + 1);
        },
        onError: (err) => {
          console.error("Error playing audio:", err);
          setError("Failed to play audio. Please try again.");
        },
      });
    }
  };
  
  return {
    audioRef,
    isPlaying,
    playCount,
    isLoading,
    error,
    maxPlays,
    handlePlayPause
  };
};
