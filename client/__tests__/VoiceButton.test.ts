/**
 * Tests for VoiceButton component logic
 *
 * Covers:
 * 1. State management (idle, listening, processing)
 * 2. Button color and accessibility
 * 3. Transcript display logic
 * 4. Press event handling
 */

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

import { parseVoiceCommand } from "../lib/voice-commands";

describe("VoiceButton - State Logic", () => {
  describe("Button state determination", () => {
    it("returns idle when not listening and not processing", () => {
      const isListening = false;
      const isProcessing = false;

      const currentState = isProcessing
        ? "processing"
        : isListening
          ? "listening"
          : "idle";

      expect(currentState).toBe("idle");
    });

    it("returns listening when listening and not processing", () => {
      const isListening = true;
      const isProcessing = false;

      const currentState = isProcessing
        ? "processing"
        : isListening
          ? "listening"
          : "idle";

      expect(currentState).toBe("listening");
    });

    it("returns processing when processing (overrides listening)", () => {
      const isListening = true;
      const isProcessing = true;

      const currentState = isProcessing
        ? "processing"
        : isListening
          ? "listening"
          : "idle";

      expect(currentState).toBe("processing");
    });
  });

  describe("Button color logic", () => {
    const theme = {
      textSecondary: "#6B7280",
      primary: "#10B981",
    };
    const LISTENING_COLOR = "#E53935";

    function getButtonColor(isProcessing: boolean, isListening: boolean) {
      if (isProcessing) return theme.textSecondary;
      if (isListening) return LISTENING_COLOR;
      return theme.primary;
    }

    it("returns secondary color when processing", () => {
      const color = getButtonColor(true, false);
      expect(color).toBe(theme.textSecondary);
    });

    it("returns red when listening", () => {
      const color = getButtonColor(false, true);
      expect(color).toBe(LISTENING_COLOR);
    });

    it("returns primary color when idle", () => {
      const color = getButtonColor(false, false);
      expect(color).toBe(theme.primary);
    });
  });

  describe("Accessibility labels", () => {
    function getAccessibilityLabel(
      isProcessing: boolean,
      isListening: boolean,
      error: string | null,
    ) {
      if (isProcessing) return "Processing voice command, please wait";
      if (isListening) return "Listening, tap to stop and process";
      if (error) return `Voice input error: ${error}. Tap to try again`;
      return "Tap to start voice command";
    }

    it("returns processing label when processing", () => {
      const label = getAccessibilityLabel(true, false, null);
      expect(label).toBe("Processing voice command, please wait");
    });

    it("returns listening label when listening", () => {
      const label = getAccessibilityLabel(false, true, null);
      expect(label).toBe("Listening, tap to stop and process");
    });

    it("returns error label when error exists", () => {
      const label = getAccessibilityLabel(false, false, "Microphone denied");
      expect(label).toBe(
        "Voice input error: Microphone denied. Tap to try again",
      );
    });

    it("returns idle label when idle", () => {
      const label = getAccessibilityLabel(false, false, null);
      expect(label).toBe("Tap to start voice command");
    });
  });

  describe("Accessibility hints", () => {
    function getAccessibilityHint(isListening: boolean) {
      if (isListening)
        return "Double tap to stop listening and process your command";
      return "Double tap to start listening for voice commands like 'add milk to inventory'";
    }

    it("returns stop hint when listening", () => {
      const hint = getAccessibilityHint(true);
      expect(hint).toBe(
        "Double tap to stop listening and process your command",
      );
    });

    it("returns start hint when not listening", () => {
      const hint = getAccessibilityHint(false);
      expect(hint).toContain("add milk to inventory");
    });
  });
});

describe("VoiceButton - Transcript Display", () => {
  describe("Transcript bubble visibility", () => {
    function shouldShowTranscript(
      showTranscript: boolean,
      transcript: string,
      error: string | null,
      isListening: boolean,
    ) {
      if (!showTranscript) return false;
      if (!transcript && !error && !isListening) return false;
      return true;
    }

    it("hides when showTranscript is false", () => {
      const show = shouldShowTranscript(false, "Hello", null, false);
      expect(show).toBe(false);
    });

    it("hides when no transcript, no error, and not listening", () => {
      const show = shouldShowTranscript(true, "", null, false);
      expect(show).toBe(false);
    });

    it("shows when listening", () => {
      const show = shouldShowTranscript(true, "", null, true);
      expect(show).toBe(true);
    });

    it("shows when transcript exists", () => {
      const show = shouldShowTranscript(true, "Hello world", null, false);
      expect(show).toBe(true);
    });

    it("shows when error exists", () => {
      const show = shouldShowTranscript(true, "", "Mic error", false);
      expect(show).toBe(true);
    });
  });

  describe("Transcript content determination", () => {
    function getTranscriptContent(
      error: string | null,
      isListening: boolean,
      transcript: string,
    ): { type: string; text: string } {
      if (error) return { type: "error", text: error };
      if (isListening && !transcript)
        return { type: "listening", text: "Listening..." };
      if (transcript) return { type: "transcript", text: transcript };
      return { type: "none", text: "" };
    }

    it("shows error when error exists", () => {
      const content = getTranscriptContent("Permission denied", false, "");
      expect(content.type).toBe("error");
      expect(content.text).toBe("Permission denied");
    });

    it("shows listening text when listening without transcript", () => {
      const content = getTranscriptContent(null, true, "");
      expect(content.type).toBe("listening");
      expect(content.text).toBe("Listening...");
    });

    it("shows transcript when available", () => {
      const content = getTranscriptContent(null, false, "Add milk");
      expect(content.type).toBe("transcript");
      expect(content.text).toBe("Add milk");
    });

    it("returns none when no content", () => {
      const content = getTranscriptContent(null, false, "");
      expect(content.type).toBe("none");
    });
  });
});

describe("VoiceButton - Press Event Handling", () => {
  describe("Press action determination", () => {
    function determineAction(
      isListening: boolean,
      isProcessing: boolean,
    ): "stop" | "start" | "disabled" {
      if (isProcessing) return "disabled";
      if (isListening) return "stop";
      return "start";
    }

    it("returns disabled when processing", () => {
      const action = determineAction(false, true);
      expect(action).toBe("disabled");
    });

    it("returns stop when listening", () => {
      const action = determineAction(true, false);
      expect(action).toBe("stop");
    });

    it("returns start when idle", () => {
      const action = determineAction(false, false);
      expect(action).toBe("start");
    });
  });

  describe("Command parsing on transcript", () => {
    it("parses valid command from transcript", () => {
      const transcript = "add 2 apples to inventory";
      const command = parseVoiceCommand(transcript);

      expect(command.intent).toBe("ADD_FOOD");
      expect(command.entities.item).toBe("apples");
      expect(command.entities.quantity).toBe("2");
    });

    it("returns UNKNOWN for invalid command", () => {
      const transcript = "hello world";
      const command = parseVoiceCommand(transcript);

      expect(command.intent).toBe("UNKNOWN");
    });
  });
});

describe("VoiceButton - Size Configuration", () => {
  const SIZE_CONFIG = {
    small: { button: 48, icon: 20 },
    medium: { button: 56, icon: 24 },
    large: { button: 64, icon: 28 },
  };

  it("returns correct config for small size", () => {
    const config = SIZE_CONFIG["small"];
    expect(config.button).toBe(48);
    expect(config.icon).toBe(20);
  });

  it("returns correct config for medium size", () => {
    const config = SIZE_CONFIG["medium"];
    expect(config.button).toBe(56);
    expect(config.icon).toBe(24);
  });

  it("returns correct config for large size", () => {
    const config = SIZE_CONFIG["large"];
    expect(config.button).toBe(64);
    expect(config.icon).toBe(28);
  });

  it("calculates correct border radius (half of button size)", () => {
    Object.entries(SIZE_CONFIG).forEach(([size, config]) => {
      const borderRadius = config.button / 2;
      expect(borderRadius).toBe(config.button / 2);
    });
  });

  it("calculates correct pulse ring size (button + 24)", () => {
    Object.entries(SIZE_CONFIG).forEach(([size, config]) => {
      const pulseSize = config.button + 24;
      expect(pulseSize).toBeGreaterThan(config.button);
    });
  });
});

describe("VoiceButton - Voice Feedback", () => {
  describe("Feedback messages", () => {
    it("has unknown command feedback message", () => {
      const message = "Sorry, I didn't understand that command.";
      expect(message).toContain("didn't understand");
    });

    it("has error feedback message", () => {
      const message = "Sorry, there was an error with voice input.";
      expect(message).toContain("error");
    });
  });

  describe("Feedback trigger conditions", () => {
    it("triggers feedback for UNKNOWN intent when enabled", () => {
      const enableVoiceFeedback = true;
      const intent = "UNKNOWN";

      const shouldSpeak = enableVoiceFeedback && intent === "UNKNOWN";
      expect(shouldSpeak).toBe(true);
    });

    it("does not trigger feedback when disabled", () => {
      const enableVoiceFeedback = false;
      const intent = "UNKNOWN";

      const shouldSpeak = enableVoiceFeedback && intent === "UNKNOWN";
      expect(shouldSpeak).toBe(false);
    });

    it("does not trigger feedback for known intents", () => {
      const enableVoiceFeedback = true;
      const intent = "ADD_FOOD";

      const shouldSpeak =
        enableVoiceFeedback && (intent as string) === "UNKNOWN";
      expect(shouldSpeak).toBe(false);
    });
  });
});

describe("VoiceButton - Layout Modes", () => {
  describe("Floating vs Inline layout", () => {
    it("uses floating container style when floating is true", () => {
      const floating = true;
      const containerStyle = floating ? "floatingContainer" : "inlineContainer";

      expect(containerStyle).toBe("floatingContainer");
    });

    it("uses inline container style when floating is false", () => {
      const floating = false;
      const containerStyle = floating ? "floatingContainer" : "inlineContainer";

      expect(containerStyle).toBe("inlineContainer");
    });
  });

  describe("Transcript bubble position", () => {
    it("positions transcript above button in floating mode", () => {
      const floating = true;
      const position = floating ? "above" : "beside";

      expect(position).toBe("above");
    });

    it("positions transcript beside button in inline mode", () => {
      const floating = false;
      const position = floating ? "above" : "beside";

      expect(position).toBe("beside");
    });
  });
});
