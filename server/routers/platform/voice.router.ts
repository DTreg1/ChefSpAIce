import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../../lib/logger";
import { successResponse } from "../../lib/apiResponse";

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

router.post("/transcribe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw AppError.badRequest("Request body is required", "INVALID_REQUEST");
    }

    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      if (req.body.audioBase64 && req.body.filename) {
        const { audioBase64, filename, language = "en" } = req.body;

        if (!isValidAudioFormat(filename)) {
          throw AppError.badRequest(`Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`, "INVALID_AUDIO_FORMAT");
        }

        const mimeType = getAudioMimeType(filename);
        if (!mimeType) {
          throw AppError.badRequest("Could not determine audio MIME type", "UNKNOWN_AUDIO_FORMAT");
        }

        const audioBuffer = Buffer.from(audioBase64, "base64");

        if (audioBuffer.length > MAX_FILE_SIZE) {
          throw AppError.badRequest(`Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, "FILE_TOO_LARGE");
        }

        if (audioBuffer.length === 0) {
          throw AppError.badRequest("The audio file appears to be empty", "EMPTY_AUDIO");
        }

        const file = new File([audioBuffer], filename, { type: mimeType });

        const response = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          language,
          response_format: "json",
        });

        return res.json(successResponse({
          transcript: response.text,
          language,
        }));
      }

      throw AppError.badRequest("Expected multipart/form-data with audio file or JSON with audioBase64 and filename", "INVALID_REQUEST_FORMAT");
    }

    const files = (req as any).files;
    const file = files?.file || files?.audio;

    if (!file) {
      throw AppError.badRequest("Please upload an audio file with field name 'file' or 'audio'", "MISSING_AUDIO_FILE");
    }

    const filename = file.name || file.originalname || "audio.m4a";

    if (!isValidAudioFormat(filename)) {
      throw AppError.badRequest(`Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`, "INVALID_AUDIO_FORMAT");
    }

    const fileData = file.data || file.buffer;

    if (!fileData || fileData.length === 0) {
      throw AppError.badRequest("The audio file appears to be empty", "EMPTY_AUDIO");
    }

    if (fileData.length > MAX_FILE_SIZE) {
      throw AppError.badRequest(`Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, "FILE_TOO_LARGE");
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

    logger.info("Transcription completed", { transcriptPreview: response.text.substring(0, 50) });

    return res.json(successResponse({
      transcript: response.text,
      language,
    }));
  } catch (error) {
    next(error);
  }
});

const speakSchema = z.object({
  text: z.string().min(1, "Text is required").max(4096, "Text must be under 4096 characters"),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional().default("alloy"),
});

router.post("/speak", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = speakSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors;
      const isEmptyText = errors.some(e => e.path.includes("text") && e.code === "too_small");
      const isTooLong = errors.some(e => e.path.includes("text") && e.code === "too_big");

      if (isEmptyText) {
        throw AppError.badRequest("Text is required and cannot be empty", "EMPTY_TEXT");
      }

      if (isTooLong) {
        throw AppError.badRequest("Text must be under 4096 characters", "TEXT_TOO_LONG");
      }

      const errorMessages = errors.map((e) => e.message).join(", ");
      throw AppError.badRequest(errorMessages, "INVALID_INPUT");
    }

    const { text, voice } = parseResult.data;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-audio-preview",
      modalities: ["text", "audio"],
      audio: {
        voice: voice,
        format: "mp3",
      },
      messages: [
        {
          role: "system",
          content: "You are a helpful voice assistant. Speak the provided text naturally and clearly. Do not add any extra commentary, just speak the text as given.",
        },
        {
          role: "user",
          content: `Please speak the following text naturally: "${text}"`,
        },
      ],
      max_completion_tokens: 4096,
    });

    const audioData = completion.choices[0]?.message?.audio;

    if (!audioData || !audioData.data) {
      throw AppError.internal("No audio was generated from the AI response", "SPEECH_GENERATION_FAILED");
    }

    logger.info("Speech generated", { textPreview: text.substring(0, 50) });

    return res.json(successResponse({
      audio: audioData.data,
      format: "mp3",
      duration: audioData.transcript ? undefined : undefined,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/parse", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = parseCommandSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw AppError.badRequest(errorMessages, "INVALID_INPUT");
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
      throw AppError.internal("No response from AI parser", "PARSE_FAILED");
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

    logger.info("Command parsed", { text, intent: parsed.intent, confidence: parsed.confidence });

    return res.json(successResponse({
      ...parsed,
      rawText: text,
    }));
  } catch (error) {
    next(error);
  }
});

const CHEF_SYSTEM_PROMPT = `You are Chef SpAIce, a friendly and knowledgeable AI kitchen assistant. You help users manage their food inventory, suggest recipes based on available ingredients, and provide cooking tips. Keep responses conversational and concise (under 3 sentences for simple questions, up to 5 for complex ones). Be warm and encouraging.`;

const conversationHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })
).optional();

router.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      throw AppError.badRequest("Expected multipart/form-data with audio file", "INVALID_REQUEST_FORMAT");
    }

    const files = (req as any).files;
    const file = files?.file || files?.audio;

    if (!file) {
      throw AppError.badRequest("Please upload an audio file with field name 'file' or 'audio'", "MISSING_AUDIO_FILE");
    }

    const filename = file.name || file.originalname || "audio.m4a";

    if (!isValidAudioFormat(filename)) {
      throw AppError.badRequest(`Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`, "INVALID_AUDIO_FORMAT");
    }

    const fileData = file.data || file.buffer;

    if (!fileData || fileData.length === 0) {
      throw AppError.badRequest("The audio file appears to be empty", "EMPTY_AUDIO");
    }

    if (fileData.length > MAX_FILE_SIZE) {
      throw AppError.badRequest(`Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, "FILE_TOO_LARGE");
    }

    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (req.body?.conversationHistory) {
      try {
        const parsed = typeof req.body.conversationHistory === "string"
          ? JSON.parse(req.body.conversationHistory)
          : req.body.conversationHistory;
        
        const validationResult = conversationHistorySchema.safeParse(parsed);
        if (validationResult.success && validationResult.data) {
          conversationHistory = validationResult.data;
        }
      } catch (parseError) {
        logger.warn("Failed to parse conversation history, continuing without it");
      }
    }

    const mimeType = getAudioMimeType(filename) || "audio/m4a";
    const audioFile = new File([fileData], filename, { type: mimeType });

    logger.info("Transcribing user audio");
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    const userTranscript = transcriptionResponse.text;
    logger.info("User transcript received", { transcriptPreview: userTranscript.substring(0, 50) });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: CHEF_SYSTEM_PROMPT },
    ];

    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: userTranscript });

    logger.info("Getting AI chef response");
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_completion_tokens: 512,
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw AppError.internal("No response generated from the AI chef", "AI_RESPONSE_FAILED");
    }

    logger.info("Chef response received", { responsePreview: aiResponse.substring(0, 50) });

    logger.info("Generating speech for AI response");
    const ttsCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini-audio-preview",
      modalities: ["text", "audio"],
      audio: {
        voice: "alloy",
        format: "mp3",
      },
      messages: [
        {
          role: "system",
          content: "You are Chef SpAIce. Speak the provided text naturally and warmly, as a friendly chef would. Do not add any extra commentary, just speak the text as given.",
        },
        {
          role: "user",
          content: `Please speak the following response naturally: "${aiResponse}"`,
        },
      ],
      max_completion_tokens: 4096,
    });

    const audioData = ttsCompletion.choices[0]?.message?.audio;

    if (!audioData || !audioData.data) {
      throw AppError.internal("No audio was generated for the AI response", "SPEECH_GENERATION_FAILED");
    }

    logger.info("Voice conversation complete");

    return res.json(successResponse({
      userTranscript,
      aiResponse,
      audioResponse: audioData.data,
      audioFormat: "mp3",
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json(successResponse({
    status: "ok",
    supportedFormats: SUPPORTED_AUDIO_FORMATS,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
  }));
});

export default router;
