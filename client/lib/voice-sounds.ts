import { Platform } from "react-native";

type SoundType = "start" | "stop" | "success" | "error";

const SOUND_FREQUENCIES: Record<
  SoundType,
  { freq: number; duration: number; type: OscillatorType }[]
> = {
  start: [
    { freq: 440, duration: 80, type: "sine" },
    { freq: 587, duration: 80, type: "sine" },
  ],
  stop: [{ freq: 523, duration: 100, type: "sine" }],
  success: [
    { freq: 523, duration: 80, type: "sine" },
    { freq: 659, duration: 80, type: "sine" },
    { freq: 784, duration: 120, type: "sine" },
  ],
  error: [
    { freq: 220, duration: 150, type: "triangle" },
    { freq: 196, duration: 150, type: "triangle" },
  ],
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") {
    return null;
  }

  if (typeof window === "undefined" || !window.AudioContext) {
    return null;
  }

  if (!audioContext) {
    try {
      audioContext = new window.AudioContext();
    } catch {
      return null;
    }
  }

  return audioContext;
}

async function playTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  startTime: number = 0,
): Promise<void> {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const actualStartTime = context.currentTime + startTime;
  const endTime = actualStartTime + duration / 1000;

  gainNode.gain.setValueAtTime(0.15, actualStartTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

  oscillator.start(actualStartTime);
  oscillator.stop(endTime);

  return new Promise((resolve) => {
    setTimeout(resolve, startTime * 1000 + duration);
  });
}

export async function playVoiceSound(type: SoundType): Promise<void> {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const tones = SOUND_FREQUENCIES[type];
  let time = 0;

  for (const tone of tones) {
    await playTone(context, tone.freq, tone.duration, tone.type, time);
    time = 0;
  }
}

export function useVoiceSounds(enabled: boolean = false) {
  const playStart = async () => {
    if (enabled) {
      await playVoiceSound("start");
    }
  };

  const playStop = async () => {
    if (enabled) {
      await playVoiceSound("stop");
    }
  };

  const playSuccess = async () => {
    if (enabled) {
      await playVoiceSound("success");
    }
  };

  const playError = async () => {
    if (enabled) {
      await playVoiceSound("error");
    }
  };

  return {
    playStart,
    playStop,
    playSuccess,
    playError,
    isAvailable:
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      !!window.AudioContext,
  };
}
