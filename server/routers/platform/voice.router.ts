import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SUPPORTED_AUDIO_FORMATS = [
  "m4a",
  "mp3",
  "wav",
  "webm",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const parseCommandSchema = z.object({
  text: z.string().min(1, "Transcript text is required"),
});

type CommandIntent =
  | "ADD_FOOD"
  | "SEARCH_INVENTORY"
  | "GENERATE_RECIPE"
  | "READ_RECIPE"
  | "NEXT_STEP"
  | "PREVIOUS_STEP"
  | "REPEAT_STEP"
  | "WHAT_EXPIRES"
  | "HELP"
  | "UNKNOWN";

interface ParsedCommand {
  intent: CommandIntent;
  entities: Record<string, string | number>;
  confidence: number;
}

function getAudioMimeType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    m4a: "audio/m4a",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
    oga: "audio/ogg",
    ogg: "audio/ogg",
  };

  return ext && mimeTypes[ext] ? mimeTypes[ext] : null;
}

function isValidAudioFormat(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_AUDIO_FORMATS.includes(ext) : false;
}

router.post("/transcribe", async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Invalid request",
        details: "Request body is required",
      });
    }

    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      if (req.body.audioBase64 && req.body.filename) {
        const { audioBase64, filename, language = "en" } = req.body;

        if (!isValidAudioFormat(filename)) {
          return res.status(400).json({
            error: "Invalid audio format",
            details: `Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`,
          });
        }

        const mimeType = getAudioMimeType(filename);
        if (!mimeType) {
          return res.status(400).json({
            error: "Unknown audio format",
            details: "Could not determine audio MIME type",
          });
        }

        const audioBuffer = Buffer.from(audioBase64, "base64");

        if (audioBuffer.length > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: "File too large",
            details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          });
        }

        if (audioBuffer.length === 0) {
          return res.status(400).json({
            error: "Empty audio",
            details: "The audio file appears to be empty",
          });
        }

        const file = new File([audioBuffer], filename, { type: mimeType });

        const response = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          language,
          response_format: "json",
        });

        return res.json({
          transcript: response.text,
          language,
        });
      }

      return res.status(400).json({
        error: "Invalid request format",
        details:
          "Expected multipart/form-data with audio file or JSON with audioBase64 and filename",
      });
    }

    const files = (req as any).files;
    const file = files?.file || files?.audio;

    if (!file) {
      return res.status(400).json({
        error: "No audio file provided",
        details:
          "Please upload an audio file with field name 'file' or 'audio'",
      });
    }

    const filename = file.name || file.originalname || "audio.m4a";

    if (!isValidAudioFormat(filename)) {
      return res.status(400).json({
        error: "Invalid audio format",
        details: `Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`,
      });
    }

    const fileData = file.data || file.buffer;

    if (!fileData || fileData.length === 0) {
      return res.status(400).json({
        error: "Empty audio",
        details: "The audio file appears to be empty",
      });
    }

    if (fileData.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "File too large",
        details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    const mimeType = getAudioMimeType(filename) || "audio/m4a";
    const audioFile = new File([fileData], filename, { type: mimeType });

    const language = req.body?.language || "en";

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
      response_format: "json",
    });

    console.log(`[Voice] Transcription completed: "${response.text.substring(0, 50)}..."`);

    return res.json({
      transcript: response.text,
      language,
    });
  } catch (error: any) {
    console.error("Transcription error:", error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        details: "Too many requests. Please try again in a moment.",
      });
    }

    if (error.code === "audio_too_short") {
      return res.status(400).json({
        error: "Audio too short",
        details:
          "The audio recording is too short to transcribe. Please record a longer message.",
      });
    }

    if (error.message?.includes("Invalid file format")) {
      return res.status(400).json({
        error: "Invalid audio format",
        details:
          "The audio file format is not supported or the file is corrupted.",
      });
    }

    return res.status(500).json({
      error: "Transcription failed",
      details:
        error.message || "An unexpected error occurred during transcription",
    });
  }
});

router.post("/parse", async (req: Request, res: Response) => {
  try {
    const parseResult = parseCommandSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({
        error: "Invalid input",
        details: errorMessages,
      });
    }

    const { text } = parseResult.data;

    const systemPrompt = `You are a voice command parser for a food inventory management app called FreshPantry.

Parse the user's voice command and identify:
1. The intent (what they want to do)
2. Relevant entities (item names, quantities, recipe names, step numbers)
3. Your confidence level (0.0 to 1.0)

Available intents:
- ADD_FOOD: User wants to add food to their inventory
  Examples: "add milk", "put eggs in fridge", "add 2 apples"
  Entities: item, quantity, unit, location
- SEARCH_INVENTORY: User wants to search or check their inventory
  Examples: "do I have milk", "check my pantry", "find eggs"
  Entities: query
- GENERATE_RECIPE: User wants to view/generate/create recipes or get cooking ideas
  Examples: "show me recipes", "what can I cook", "make a recipe", "give me recipes", "suggest a recipe with chicken"
  Entities: ingredients (optional)
- READ_RECIPE: User wants a recipe read aloud
  Entities: recipeName
- NEXT_STEP: User wants the next recipe step
  Examples: "next", "next step"
- PREVIOUS_STEP: User wants to go back to previous step
  Examples: "previous", "go back"
- REPEAT_STEP: User wants current step repeated
  Examples: "repeat", "say that again"
- WHAT_EXPIRES: User wants to know what's expiring soon
  Examples: "what's expiring", "what expires soon"
- HELP: User wants help or to know available commands
- UNKNOWN: Command doesn't clearly match any intent

Return ONLY valid JSON in this format:
{
  "intent": "INTENT_NAME",
  "entities": { "key": "value" },
  "confidence": 0.85
}`;

    const userPrompt = `Parse this voice command for FreshPantry:\n"${text}"\n\nReturn JSON only.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "Parse failed",
        details: "No response from AI parser",
      });
    }

    const parsed: ParsedCommand = JSON.parse(content);

    const validIntents: CommandIntent[] = [
      "ADD_FOOD",
      "SEARCH_INVENTORY",
      "GENERATE_RECIPE",
      "READ_RECIPE",
      "NEXT_STEP",
      "PREVIOUS_STEP",
      "REPEAT_STEP",
      "WHAT_EXPIRES",
      "HELP",
      "UNKNOWN",
    ];

    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = "UNKNOWN";
      parsed.confidence = 0;
    }

    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    console.log(`[Voice] Command parsed: "${text}" -> ${parsed.intent} (confidence: ${parsed.confidence})`);

    return res.json({
      ...parsed,
      rawText: text,
    });
  } catch (error: any) {
    console.error("Parse error:", error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        details: "Too many requests. Please try again in a moment.",
      });
    }

    return res.status(500).json({
      error: "Parse failed",
      details:
        error.message ||
        "An unexpected error occurred while parsing the command",
    });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    supportedFormats: SUPPORTED_AUDIO_FORMATS,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
  });
});

export default router;
