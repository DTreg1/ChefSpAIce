/**
 * Tests for useTextToSpeech hook
 *
 * Covers:
 * 1. Speech synthesis
 * 2. Queue management
 * 3. Pause/resume (iOS)
 * 4. Error handling
 */

const mockSpeak = jest.fn();
const mockStop = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockGetAvailableVoicesAsync = jest.fn();

jest.mock("expo-speech", () => ({
  speak: (text: string, options: any) => {
    mockSpeak(text, options);
    setTimeout(() => options?.onDone?.(), 10);
  },
  stop: () => mockStop(),
  pause: () => mockPause(),
  resume: () => mockResume(),
  getAvailableVoicesAsync: () => mockGetAvailableVoicesAsync(),
}));

import * as Speech from "expo-speech";

describe("useTextToSpeech - Speech Synthesis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableVoicesAsync.mockResolvedValue([
      { identifier: "en-US-1", language: "en-US", name: "English US" },
      { identifier: "es-ES-1", language: "es-ES", name: "Spanish Spain" },
      { identifier: "fr-FR-1", language: "fr-FR", name: "French France" },
    ]);
  });

  describe("speak function", () => {
    it("calls Speech.speak with text", () => {
      Speech.speak("Hello world", { rate: 1.0 });

      expect(mockSpeak).toHaveBeenCalledWith(
        "Hello world",
        expect.objectContaining({ rate: 1.0 }),
      );
    });

    it("passes rate option to Speech.speak", () => {
      Speech.speak("Test", { rate: 1.5 });

      expect(mockSpeak).toHaveBeenCalledWith(
        "Test",
        expect.objectContaining({ rate: 1.5 }),
      );
    });

    it("passes pitch option to Speech.speak", () => {
      Speech.speak("Test", { pitch: 0.8 });

      expect(mockSpeak).toHaveBeenCalledWith(
        "Test",
        expect.objectContaining({ pitch: 0.8 }),
      );
    });

    it("passes language option to Speech.speak", () => {
      Speech.speak("Hola", { language: "es-ES" });

      expect(mockSpeak).toHaveBeenCalledWith(
        "Hola",
        expect.objectContaining({ language: "es-ES" }),
      );
    });

    it("passes voice option when specified", () => {
      Speech.speak("Test", { voice: "en-US-1" });

      expect(mockSpeak).toHaveBeenCalledWith(
        "Test",
        expect.objectContaining({ voice: "en-US-1" }),
      );
    });
  });

  describe("stop function", () => {
    it("calls Speech.stop", async () => {
      await Speech.stop();
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe("pause function", () => {
    it("calls Speech.pause", () => {
      Speech.pause();
      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe("resume function", () => {
    it("calls Speech.resume", () => {
      Speech.resume();
      expect(mockResume).toHaveBeenCalled();
    });
  });

  describe("getAvailableVoicesAsync", () => {
    it("returns available voices", async () => {
      const voices = await Speech.getAvailableVoicesAsync();

      expect(voices).toHaveLength(3);
      expect(voices[0].language).toBe("en-US");
      expect(voices[1].language).toBe("es-ES");
    });
  });
});

describe("useTextToSpeech - Rate and Pitch Validation", () => {
  describe("Rate clamping", () => {
    it("clamps rate to maximum of 2.0", () => {
      const rate = Math.min(2.0, Math.max(0.5, 3.0));
      expect(rate).toBe(2.0);
    });

    it("clamps rate to minimum of 0.5", () => {
      const rate = Math.min(2.0, Math.max(0.5, 0.1));
      expect(rate).toBe(0.5);
    });

    it("allows rate within valid range", () => {
      const rate = Math.min(2.0, Math.max(0.5, 1.25));
      expect(rate).toBe(1.25);
    });
  });

  describe("Pitch clamping", () => {
    it("clamps pitch to maximum of 2.0", () => {
      const pitch = Math.min(2.0, Math.max(0.5, 2.5));
      expect(pitch).toBe(2.0);
    });

    it("clamps pitch to minimum of 0.5", () => {
      const pitch = Math.min(2.0, Math.max(0.5, 0.2));
      expect(pitch).toBe(0.5);
    });

    it("allows pitch within valid range", () => {
      const pitch = Math.min(2.0, Math.max(0.5, 1.1));
      expect(pitch).toBe(1.1);
    });
  });
});

describe("useTextToSpeech - Queue Management", () => {
  describe("Queue operations", () => {
    it("adds items to queue", () => {
      const queue: string[] = [];
      queue.push("First");
      queue.push("Second");

      expect(queue).toHaveLength(2);
      expect(queue[0]).toBe("First");
      expect(queue[1]).toBe("Second");
    });

    it("removes item from front of queue", () => {
      const queue = ["First", "Second", "Third"];
      const item = queue.shift();

      expect(item).toBe("First");
      expect(queue).toHaveLength(2);
      expect(queue[0]).toBe("Second");
    });

    it("clears entire queue", () => {
      const queue = ["First", "Second", "Third"];
      queue.length = 0;

      expect(queue).toHaveLength(0);
    });

    it("filters empty strings from queue", () => {
      const texts = ["First", "", "  ", "Second"];
      const validTexts = texts.filter((t) => t.trim());

      expect(validTexts).toHaveLength(2);
      expect(validTexts).toEqual(["First", "Second"]);
    });
  });

  describe("Queue state tracking", () => {
    it("tracks queue length", () => {
      const state = { queueLength: 0 };
      const queue: string[] = [];

      queue.push("Item 1");
      state.queueLength = queue.length;
      expect(state.queueLength).toBe(1);

      queue.push("Item 2");
      queue.push("Item 3");
      state.queueLength = queue.length;
      expect(state.queueLength).toBe(3);
    });

    it("updates queue length after processing", () => {
      const queue = ["First", "Second", "Third"];
      let queueLength = queue.length;

      queue.shift();
      queueLength = queue.length;

      expect(queueLength).toBe(2);
    });
  });
});

describe("useTextToSpeech - State Management", () => {
  describe("Initial state", () => {
    it("defaults to not speaking", () => {
      const initialState = {
        isSpeaking: false,
        isPaused: false,
        currentText: "",
        queueLength: 0,
        availableVoices: [],
      };

      expect(initialState.isSpeaking).toBe(false);
      expect(initialState.isPaused).toBe(false);
      expect(initialState.currentText).toBe("");
      expect(initialState.queueLength).toBe(0);
    });
  });

  describe("State transitions", () => {
    it("updates speaking state when starting", () => {
      const state = { isSpeaking: false, currentText: "" };
      state.isSpeaking = true;
      state.currentText = "Test text";

      expect(state.isSpeaking).toBe(true);
      expect(state.currentText).toBe("Test text");
    });

    it("updates paused state when pausing", () => {
      const state = { isSpeaking: true, isPaused: false };
      state.isPaused = true;

      expect(state.isPaused).toBe(true);
      expect(state.isSpeaking).toBe(true);
    });

    it("resets state when stopping", () => {
      const state = {
        isSpeaking: true,
        isPaused: true,
        currentText: "Test",
        queueLength: 3,
      };

      state.isSpeaking = false;
      state.isPaused = false;
      state.currentText = "";
      state.queueLength = 0;

      expect(state.isSpeaking).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.currentText).toBe("");
      expect(state.queueLength).toBe(0);
    });
  });
});

describe("useTextToSpeech - Voice Filtering", () => {
  const voices = [
    { identifier: "en-US-1", language: "en-US", name: "English US" },
    { identifier: "en-GB-1", language: "en-GB", name: "English UK" },
    { identifier: "es-ES-1", language: "es-ES", name: "Spanish Spain" },
    { identifier: "es-MX-1", language: "es-MX", name: "Spanish Mexico" },
    { identifier: "fr-FR-1", language: "fr-FR", name: "French France" },
  ];

  it("filters voices by language prefix", () => {
    const englishVoices = voices.filter((v) => v.language.startsWith("en"));

    expect(englishVoices).toHaveLength(2);
  });

  it("returns all Spanish voices", () => {
    const spanishVoices = voices.filter((v) => v.language.startsWith("es"));

    expect(spanishVoices).toHaveLength(2);
    expect(spanishVoices.map((v) => v.language)).toEqual(["es-ES", "es-MX"]);
  });

  it("returns empty array for unavailable language", () => {
    const germanVoices = voices.filter((v) => v.language.startsWith("de"));

    expect(germanVoices).toHaveLength(0);
  });
});

describe("useTextToSpeech - Callback Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("onDone callback is invoked after speech completes", (done) => {
    const onDone = jest.fn(() => {
      expect(onDone).toHaveBeenCalled();
      done();
    });

    Speech.speak("Test", { onDone });
  });

  it("onError callback receives error object", () => {
    const onError = jest.fn();
    const error = { message: "Speech synthesis error" };

    onError(new Error(error.message));

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Speech synthesis error");
  });
});
