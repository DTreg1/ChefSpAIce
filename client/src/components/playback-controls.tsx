import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybackControlsProps {
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSeek?: (time: number) => void;
  className?: string;
}

export function PlaybackControls({
  audioUrl,
  audioBlob,
  duration = 0,
  onTimeUpdate,
  onPlayStateChange,
  onSeek,
  className,
}: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      audioRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    } else if (audioUrl) {
      audioRef.current.src = audioUrl;
    }
  }, [audioUrl, audioBlob]);

  // Handle time updates
  const updateTime = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
      
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(updateTime);
      }
    }
  };

  // Play/Pause
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      setIsLoading(true);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlayStateChange?.(true);
        animationRef.current = requestAnimationFrame(updateTime);
      } catch (error) {
        console.error("Failed to play audio:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
  };

  // Seek to position
  const seekTo = (value: number[]) => {
    if (!audioRef.current) return;
    
    const time = value[0];
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    onSeek?.(time);
  };

  // Change playback rate
  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  // Change volume
  const changeVolume = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Reset playback
  const resetPlayback = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      onPlayStateChange?.(false);
      onSeek?.(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const actualDuration = audioRef.current?.duration || duration;

  return (
    <Card className={cn("p-4", className)}>
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setCurrentTime(0);
          }
        }}
        data-testid="audio-element"
      />
      
      <div className="space-y-4">
        {/* Time Display and Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono" data-testid="text-current-time">
              {formatTime(currentTime)}
            </span>
            <span className="font-mono text-muted-foreground" data-testid="text-duration">
              {formatTime(actualDuration)}
            </span>
          </div>
          <Slider
            value={[currentTime]}
            max={actualDuration}
            step={0.1}
            onValueChange={seekTo}
            className="cursor-pointer"
            disabled={!audioUrl && !audioBlob}
            data-testid="slider-seek"
          />
        </div>
        
        {/* Main Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => skip(-10)}
            disabled={!audioUrl && !audioBlob}
            data-testid="button-skip-back"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={(!audioUrl && !audioBlob) || isLoading}
            data-testid="button-play-pause"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => skip(10)}
            disabled={!audioUrl && !audioBlob}
            data-testid="button-skip-forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Additional Controls */}
        <div className="flex items-center justify-between">
          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={changePlaybackRate}
              disabled={!audioUrl && !audioBlob}
              className="h-8 px-2 font-mono"
              data-testid="button-playback-rate"
            >
              {playbackRate}x
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={resetPlayback}
              disabled={!audioUrl && !audioBlob}
              className="h-8 w-8"
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              disabled={!audioUrl && !audioBlob}
              className="h-8 w-8"
              data-testid="button-mute"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={changeVolume}
              className="w-20"
              disabled={!audioUrl && !audioBlob}
              data-testid="slider-volume"
            />
          </div>
        </div>
        
        {/* Status Indicator */}
        {isPlaying && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
              Playing
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}

// Timestamp Jump Component
interface TimestampJumpProps {
  onJump: (timestamp: number) => void;
  className?: string;
}

export function TimestampJump({ onJump, className }: TimestampJumpProps) {
  const [inputValue, setInputValue] = useState("");
  
  const handleJump = () => {
    // Parse timestamp format (mm:ss or mm:ss.ms)
    const parts = inputValue.split(":");
    if (parts.length !== 2) return;
    
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split(".");
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) : 0;
    
    if (isNaN(minutes) || isNaN(seconds)) return;
    
    const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
    onJump(totalSeconds);
    setInputValue("");
  };
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJump()}
        placeholder="00:00"
        className="w-20 px-2 py-1 text-sm font-mono border rounded"
        data-testid="input-timestamp-jump"
      />
      <Button
        size="sm"
        onClick={handleJump}
        data-testid="button-jump-to-timestamp"
      >
        Jump
      </Button>
    </div>
  );
}