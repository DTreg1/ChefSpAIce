import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Pause, Play, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  maxDuration?: number; // Maximum recording duration in seconds (default: 300 = 5 minutes)
  onRecordingComplete?: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function AudioRecorder({
  maxDuration = 300, // 5 minutes default
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize audio context and analyzer
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        onRecordingComplete?.(audioBlob);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;

      return { stream, analyser };
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const { analyser } = await initializeAudio();

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setIsPaused(false);
        onRecordingStart?.();

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const newTime = prev + 1;
            if (newTime >= maxDuration) {
              stopRecording();
              return maxDuration;
            }
            return newTime;
          });
        }, 1000);

        // Start visualizer
        visualizeAudio(analyser);
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      onRecordingStop?.();

      // Stop all tracks
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setRecordingTime(0);
      setAudioLevel(0);
      setWaveformData([]);
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);

        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const newTime = prev + 1;
            if (newTime >= maxDuration) {
              stopRecording();
              return maxDuration;
            }
            return newTime;
          });
        }, 1000);

        // Resume visualizer
        if (analyserRef.current) {
          visualizeAudio(analyserRef.current);
        }
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);

        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Pause animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    }
  };

  // Visualize audio waveform
  const visualizeAudio = (analyser: AnalyserNode) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Calculate average audio level
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setAudioLevel(average / 255);

      // Update waveform data (keep last 50 samples)
      setWaveformData((prev) => {
        const newData = [...prev, average / 255];
        return newData.slice(-50);
      });

      // Draw waveform on canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "hsl(var(--primary))";
          ctx.beginPath();

          const sliceWidth = canvas.width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }
      }
    };

    draw();
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audio Recorder</h3>
          <div className="text-sm text-muted-foreground">
            {formatTime(recordingTime)} / {formatTime(maxDuration)}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={800}
            height={128}
          />
          {!isRecording && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {recordingTime === 0 ? "Ready to record" : "Recording stopped"}
            </div>
          )}
        </div>

        {/* Audio Level Indicator */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Audio Level</span>
              <span>{Math.round(audioLevel * 100)}%</span>
            </div>
            <Progress value={audioLevel * 100} className="h-2" />
          </div>
        )}

        {/* Recording Progress */}
        {recordingTime > 0 && (
          <Progress
            value={(recordingTime / maxDuration) * 100}
            className="h-1"
          />
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={startRecording}
              className="gap-2"
              data-testid="button-start-recording"
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          ) : (
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={togglePause}
                data-testid="button-pause-recording"
              >
                {isPaused ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="gap-2"
                data-testid="button-stop-recording"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            </>
          )}
        </div>

        {/* Visual Waveform Bars */}
        {isRecording && waveformData.length > 0 && (
          <div className="flex items-end justify-center gap-1 h-16">
            {waveformData.slice(-20).map((level, index) => (
              <div
                key={index}
                className={cn(
                  "w-1 bg-primary rounded-full transition-all duration-150",
                  isPaused && "opacity-50",
                )}
                style={{
                  height: `${level * 100}%`,
                }}
              />
            ))}
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-center">
          {isRecording && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse",
                )}
              />
              <span className="text-muted-foreground">
                {isPaused ? "Paused" : "Recording..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
