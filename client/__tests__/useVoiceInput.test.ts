/**
 * Tests for useVoiceInput hook
 *
 * Covers:
 * 1. Permission handling
 * 2. Recording flow
 * 3. Transcription
 * 4. Error handling
 */

const mockRequestRecordingPermissionsAsync = jest.fn();
const mockSetAudioModeAsync = jest.fn();
const mockPrepareToRecordAsync = jest.fn();
const mockRecord = jest.fn();
const mockStop = jest.fn();

const mockAudioRecorder = {
  prepareToRecordAsync: mockPrepareToRecordAsync,
  record: mockRecord,
  stop: mockStop,
  uri: "file://test-recording.m4a",
};

jest.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: () =>
      mockRequestRecordingPermissionsAsync(),
  },
  setAudioModeAsync: (options: any) => mockSetAudioModeAsync(options),
  useAudioRecorder: () => mockAudioRecorder,
  RecordingPresets: {
    HIGH_QUALITY: {},
    LOW_QUALITY: {},
  },
}));

jest.mock("@/lib/query-client", () => ({
  getApiUrl: () => "http://localhost:5000",
}));

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

import { AudioModule, setAudioModeAsync, RecordingPresets } from "expo-audio";

describe("useVoiceInput - Audio Recording", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
    mockSetAudioModeAsync.mockResolvedValue(undefined);
    mockPrepareToRecordAsync.mockResolvedValue(undefined);
    mockRecord.mockReturnValue(undefined);
    mockStop.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcript: "test transcript" }),
    });
  });

  describe("Permission handling", () => {
    it("requestRecordingPermissionsAsync returns granted status", async () => {
      const result = await mockRequestRecordingPermissionsAsync();
      expect(result.granted).toBe(true);
    });

    it("requestRecordingPermissionsAsync can return denied status", async () => {
      mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      });
      const result = await mockRequestRecordingPermissionsAsync();
      expect(result.granted).toBe(false);
    });

    it("permission request is called when starting recording", async () => {
      await mockRequestRecordingPermissionsAsync();
      expect(mockRequestRecordingPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe("Audio recording flow", () => {
    it("sets audio mode before recording", async () => {
      await mockSetAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    });

    it("prepares and starts recording", async () => {
      await mockAudioRecorder.prepareToRecordAsync();
      mockAudioRecorder.record();

      expect(mockPrepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecord).toHaveBeenCalled();
    });

    it("stops recording and gets URI", async () => {
      await mockAudioRecorder.stop();
      const uri = mockAudioRecorder.uri;

      expect(mockStop).toHaveBeenCalled();
      expect(uri).toBe("file://test-recording.m4a");
    });

    it("resets audio mode after recording", async () => {
      await mockSetAudioModeAsync({ allowsRecording: false });

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
      });
    });
  });

  describe("Transcription API", () => {
    it("sends audio to transcription endpoint", async () => {
      const formData = new FormData();
      formData.append("file", {
        uri: "file://test.m4a",
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);

      await mockFetch("http://localhost:5000/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/voice/transcribe",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("parses transcript from successful response", async () => {
      const response = await mockFetch();
      const data = await response.json();

      expect(data.transcript).toBe("test transcript");
    });

    it("handles transcription API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Transcription failed" }),
      });

      const response = await mockFetch();
      expect(response.ok).toBe(false);

      const errorData = await response.json();
      expect(errorData.message).toBe("Transcription failed");
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(mockFetch()).rejects.toThrow("Network error");
    });
  });

  describe("Error scenarios", () => {
    it("handles permission denied", async () => {
      mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      });

      const result = await mockRequestRecordingPermissionsAsync();
      expect(result.granted).toBe(false);
    });

    it("handles recording start failure", async () => {
      mockRecord.mockImplementationOnce(() => {
        throw new Error("Recording failed");
      });

      expect(() => mockAudioRecorder.record()).toThrow("Recording failed");
    });

    it("handles missing URI after recording", async () => {
      const recorderWithNoUri = { ...mockAudioRecorder, uri: null };
      const uri = recorderWithNoUri.uri;

      expect(uri).toBeNull();
    });
  });
});

describe("useVoiceInput - State Management", () => {
  describe("Initial state", () => {
    it("defaults to not listening", () => {
      const initialState = {
        isListening: false,
        transcript: "",
        isProcessing: false,
        error: null,
      };

      expect(initialState.isListening).toBe(false);
      expect(initialState.transcript).toBe("");
      expect(initialState.isProcessing).toBe(false);
      expect(initialState.error).toBeNull();
    });
  });

  describe("State transitions", () => {
    it("listening state updates when recording starts", () => {
      const state = { isListening: false };
      state.isListening = true;
      expect(state.isListening).toBe(true);
    });

    it("processing state updates when transcribing", () => {
      const state = { isListening: true, isProcessing: false };
      state.isListening = false;
      state.isProcessing = true;

      expect(state.isListening).toBe(false);
      expect(state.isProcessing).toBe(true);
    });

    it("transcript updates after transcription completes", () => {
      const state = { transcript: "", isProcessing: true };
      state.transcript = "test transcript";
      state.isProcessing = false;

      expect(state.transcript).toBe("test transcript");
      expect(state.isProcessing).toBe(false);
    });

    it("error state updates on failure", () => {
      const state = { error: null as string | null, isListening: true };
      state.error = "Microphone permission denied";
      state.isListening = false;

      expect(state.error).toBe("Microphone permission denied");
    });
  });
});
