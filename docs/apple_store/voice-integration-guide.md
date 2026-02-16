# Voice Conversation Integration Guide for ChefSpAIce

This guide provides step-by-step instructions with copyable prompts to implement natural voice conversations with the AI chef, plus Siri Shortcuts integration.

---

## Table of Contents

1. [Add AI-Powered Text-to-Speech Endpoint](#step-1-add-ai-powered-text-to-speech-endpoint)
2. [Create Voice Conversation Endpoint](#step-2-create-voice-conversation-endpoint)
3. [Create AI Voice Hook for React Native](#step-3-create-ai-voice-hook-for-react-native)
4. [Create Voice Chat Hook](#step-4-create-voice-chat-hook)
5. [Add Voice Conversation Mode to Chat Modal](#step-5-add-voice-conversation-mode-to-chat-modal)
6. [Add Voice Quick Actions from Home Screen](#step-6-add-voice-quick-actions-from-home-screen)
7. [Prepare for Siri Shortcuts Integration](#step-7-prepare-for-siri-shortcuts-integration)
8. [Test Voice Conversation Flow](#step-8-test-voice-conversation-flow)
9. [Siri Shortcut Setup Guide for Users](#step-9-siri-shortcut-setup-guide-for-users)

---

## Current State

Before starting, here's what already exists:

| Feature | Current Implementation | Status |
|---------|----------------------|--------|
| Speech-to-Text | Whisper (whisper-1) via `/api/voice/transcribe` | ✅ Working |
| Text-to-Speech | expo-speech (device TTS) | ⚠️ Robotic voice |
| Voice Commands | Structured parsing via `/api/voice/parse` | ✅ Working |
| AI Chat | Text-based via `/api/chat` | ✅ Working |

---

## Step 1: Add AI-Powered Text-to-Speech Endpoint

### Goal
Replace the robotic device voice with OpenAI's natural AI voice.

### Prompt to Copy

```
Add an AI-powered text-to-speech endpoint to the voice router at server/routers/platform/voice.router.ts.

Create a POST endpoint at /api/voice/speak that:

1. Accepts JSON body: { text: string, voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" }
2. Validates that text is not empty and under 4096 characters
3. Uses OpenAI to generate speech audio
4. Returns JSON: { audio: string (base64), format: "mp3", duration?: number }

Use the existing OpenAI client already configured in the file:
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

For the TTS, use OpenAI's chat completions API with the gpt-audio model since AI Integrations doesn't support the speech API directly. The approach should be:
- Use gpt-audio or gpt-audio-mini model
- Send a system message asking it to speak the text naturally
- Extract the audio from the response

Include proper error handling for:
- Empty text (400 error)
- Text too long (400 error)  
- Rate limits (429 error)
- API failures (500 error)

Add this endpoint after the existing /transcribe endpoint in the same router file.
```

### Expected Files Modified
- `server/routers/platform/voice.router.ts`

---

## Step 2: Create Voice Conversation Endpoint

### Goal
Enable full voice-in, voice-out conversations with the AI chef.

### Prompt to Copy

```
Create a voice conversation endpoint at POST /api/voice/chat in server/routers/platform/voice.router.ts that enables natural voice conversations with the AI chef.

This endpoint should:

1. Accept multipart/form-data with:
   - file: audio file (m4a, wav, webm, mp3)
   - conversationHistory: optional JSON string of previous messages

2. Process the voice message:
   a. Transcribe the audio using the existing Whisper logic (whisper-1 model)
   b. Build a chat prompt with the AI chef's personality and user's transcript
   c. Get the AI response using gpt-4o or gpt-4o-mini
   d. Convert the response to speech using the TTS logic from Step 1

3. Return JSON:
   {
     userTranscript: string,      // What the user said
     aiResponse: string,          // The chef's text response
     audioResponse: string,       // Base64 encoded audio of the response
     audioFormat: "mp3"
   }

Use this system prompt for the AI chef:
"You are Chef SpAIce, a friendly and knowledgeable AI kitchen assistant. You help users manage their food inventory, suggest recipes based on available ingredients, and provide cooking tips. Keep responses conversational and concise (under 3 sentences for simple questions, up to 5 for complex ones). Be warm and encouraging."

Include the same error handling patterns as the transcribe endpoint (rate limits, audio format validation, etc.).

Make sure to reuse the existing helper functions like isValidAudioFormat() and getAudioMimeType() already in the file.
```

### Expected Files Modified
- `server/routers/platform/voice.router.ts`

---

## Step 3: Create AI Voice Hook for React Native

### Goal
Create a reusable hook for AI-powered text-to-speech in the mobile app.

### Prompt to Copy

```
Create a new React Native hook called useAIVoice in client/hooks/useAIVoice.ts that provides AI-powered text-to-speech.

The hook should:

1. Import necessary dependencies:
   - useState, useCallback, useRef, useEffect from react
   - Audio from expo-av
   - getApiUrl from @/lib/query-client

2. Manage these states:
   - isSpeaking: boolean
   - isLoading: boolean  
   - error: string | null
   - currentText: string

3. Provide these functions:
   - speak(text: string, voice?: string): Promise<void>
     - Calls POST /api/voice/speak with the text
     - Decodes the base64 audio response
     - Plays the audio using expo-av Audio.Sound
   - stop(): Promise<void>
     - Stops current playback immediately
     - Unloads the sound
   - pause(): Promise<void>
     - Pauses current playback
   - resume(): Promise<void>
     - Resumes paused playback

4. Handle cleanup:
   - Unload any playing sound on unmount
   - Cancel pending requests on unmount

5. Return:
   {
     speak,
     stop,
     pause,
     resume,
     isSpeaking,
     isLoading,
     error,
     currentText,
     clearError: () => void
   }

Use the pattern from existing hooks like useVoiceInput.ts for consistency. The API call should use getApiUrl() to build the full URL and include credentials: "include" in the fetch options.
```

### Expected Files Created
- `client/hooks/useAIVoice.ts`

---

## Step 4: Create Voice Chat Hook

### Goal
Combine voice input and AI voice output for seamless conversations.

### Prompt to Copy

```
Create a useVoiceChat hook in client/hooks/useVoiceChat.ts that combines voice input and AI voice output for natural conversations.

The hook should:

1. Import and use:
   - useVoiceInput from ./useVoiceInput
   - useAIVoice from ./useAIVoice
   - useState, useCallback, useRef from react
   - Audio, useAudioRecorder, RecordingPresets from expo-audio
   - getApiUrl from @/lib/query-client

2. Manage conversation state:
   - messages: Array<{ role: "user" | "assistant", content: string, timestamp: Date }>
   - isProcessing: boolean (between user stops speaking and AI starts responding)

3. Provide these functions:
   - startConversation(): Promise<void>
     - Start recording user's voice
   - endConversation(): Promise<void>  
     - Stop recording
     - Send audio to /api/voice/chat
     - Add user message to messages array
     - Play AI audio response
     - Add AI message to messages array
   - cancelConversation(): void
     - Cancel current recording/processing
     - Stop any playing audio
   - clearHistory(): void
     - Clear all messages

4. Combine states from child hooks:
   - isListening: from useVoiceInput or local recording state
   - isSpeaking: from useAIVoice
   - isProcessing: local state for the gap between input and output

5. Return:
   {
     startConversation,
     endConversation,
     cancelConversation,
     clearHistory,
     messages,
     isListening,
     isProcessing,
     isSpeaking,
     isActive: isListening || isProcessing || isSpeaking,
     error: string | null,
     lastUserTranscript: string | null
   }

For sending audio to the API, create a FormData object with the audio file and use fetch with multipart/form-data content type.
```

### Expected Files Created
- `client/hooks/useVoiceChat.ts`

---

## Step 5: Add Voice Conversation Mode to Chat Modal

### Goal
Add a toggle for voice mode in the existing chat interface.

### Prompt to Copy

```
Enhance the ChatModal component at client/components/ChatModal.tsx to support voice conversation mode.

Add the following:

1. Import the useVoiceChat hook from @/hooks/useVoiceChat

2. Add a voice mode state: const [isVoiceMode, setIsVoiceMode] = useState(false)

3. Add a voice mode toggle button:
   - Place it next to the text input area
   - Use Feather icon "mic" for voice mode, "type" for text mode
   - Style it to match the existing UI theme

4. When voice mode is active, replace the text input with:
   - A large circular microphone button (centered)
   - Press-and-hold OR tap-to-toggle recording
   - Visual states:
     - Idle: Gray microphone icon, "Tap to speak" text below
     - Listening: Red pulsing circle around mic, "Listening..." text
     - Processing: Spinner icon, "Thinking..." text  
     - Speaking: Speaker/sound wave icon, "Speaking..." text

5. Show the transcribed text:
   - Display lastUserTranscript while processing
   - Add both user and AI messages to the existing chat display

6. Add a "replay" button on AI messages:
   - Small speaker icon next to AI messages
   - Tapping it re-speaks that message using useAIVoice

7. Keep all existing text chat functionality working:
   - Voice mode is just an alternative input method
   - Messages appear in the same conversation list
   - Can switch between voice and text freely

Use the existing theme colors from useTheme() for consistency. Match the animation style of other components in the app.
```

### Expected Files Modified
- `client/components/ChatModal.tsx`

---

## Step 6: Add Voice Quick Actions from Home Screen

### Goal
Allow quick voice interactions without opening the full chat.

### Prompt to Copy

```
Add a floating voice action button to the main screen that allows quick voice interactions.

1. Create a new component client/components/VoiceQuickAction.tsx:
   - Floating action button (FAB) positioned bottom-right
   - Microphone icon using Feather icons
   - Matches app theme colors

2. When pressed, show an overlay with:
   - Semi-transparent dark background
   - Large centered microphone button  
   - "Listening..." text when active
   - Cancel button (X) in corner

3. Process the voice command:
   - Record audio when button is held/tapped
   - Send to /api/voice/transcribe for transcription
   - Send transcript to /api/voice/parse to identify intent
   - Execute the command based on intent:
     - ADD_FOOD: Add item via existing storage methods, speak confirmation
     - WHAT_EXPIRES: Query expiring items, speak the list
     - SEARCH_INVENTORY: Check for item, speak result
     - GENERATE_RECIPE: Open ChatModal with the request
   - Speak the response using useAIVoice hook
   - Auto-dismiss overlay after response completes

4. Handle edge cases:
   - Show error toast if transcription fails
   - Timeout after 30 seconds of silence
   - Allow cancel at any point

5. Add this component to the main navigation/home screen layout so it's always visible.

Use react-native-reanimated for smooth animations. The overlay should fade in/out smoothly.
```

### Expected Files Created
- `client/components/VoiceQuickAction.tsx`

### Expected Files Modified
- Main screen/navigation file to include the FAB

---

## Step 7: Prepare for Siri Shortcuts Integration

### Goal
Create API endpoints that Siri Shortcuts can call.

### Prompt to Copy

```
Prepare the backend for Siri Shortcuts integration by creating an external API.

1. Create a new router file server/routers/external-api.router.ts:

2. Add these endpoints:

   POST /api/external/action
   - Accepts JSON: { 
       apiKey: string,
       action: "add_item" | "check_inventory" | "what_expires" | "quick_recipe",
       item?: string,
       quantity?: number,
       unit?: string
     }
   - Validates API key against user's stored key
   - Executes the action:
     - add_item: Add to user's inventory, return { success: true, message: "Added {item} to your pantry" }
     - check_inventory: Search inventory, return { success: true, found: boolean, message: "Yes, you have {item}" or "No {item} found" }
     - what_expires: Get items expiring in 3 days, return { success: true, items: [...], message: "You have X items expiring soon: ..." }
     - quick_recipe: Get a simple recipe suggestion, return { success: true, recipe: string, message: "Try making..." }
   - Returns: { success: boolean, message: string, data?: any }

   POST /api/external/generate-key  
   - Requires normal authentication (session)
   - Generates a new API key for the user
   - Stores hashed key in users table (add apiKeyHash column if needed)
   - Returns the plain key ONCE: { apiKey: string }
   - Note: Key can only be viewed at generation time

   DELETE /api/external/revoke-key
   - Requires normal authentication
   - Removes user's API key
   - Returns: { success: true }

3. Add API key validation middleware:
   - Check apiKey in request body
   - Hash it and compare to stored hash
   - Attach user to request if valid
   - Return 401 if invalid

4. Register the router in server/routes.ts under /api/external

5. If needed, add apiKeyHash column to the users table in shared/schema.ts
```

### Expected Files Created
- `server/routers/external-api.router.ts`

### Expected Files Modified
- `server/routes.ts` (register new router)
- `shared/schema.ts` (add apiKeyHash column if needed)

---

## Step 8: Test Voice Conversation Flow

### Goal
Verify all voice features work correctly.

### Prompt to Copy

```
Test the complete voice conversation implementation:

1. Test the /api/voice/speak endpoint:
   - Send a short text ("Hello, I'm your chef assistant")
   - Send a longer text (full recipe instructions)
   - Test with different voice options if supported
   - Verify audio plays correctly on mobile

2. Test the /api/voice/chat endpoint:
   - Record a simple question ("What can I cook with eggs?")
   - Verify transcription is accurate
   - Verify AI response is relevant
   - Verify audio response plays naturally

3. Test the ChatModal voice mode:
   - Toggle voice mode on
   - Record a message and verify it appears in chat
   - Verify AI response appears and is spoken
   - Toggle back to text mode and send a text message
   - Verify conversation history is maintained

4. Test the VoiceQuickAction FAB:
   - Say "Add milk to my pantry"
   - Verify item is added
   - Verify confirmation is spoken
   - Say "What's expiring soon?"
   - Verify expiring items are listed and spoken

5. Test the external API:
   - Generate an API key in settings
   - Call /api/external/action with the key
   - Verify action executes correctly
   - Test with invalid key (should get 401)

6. Test edge cases:
   - Very quiet audio
   - Background noise
   - Interrupt while AI is speaking
   - Network timeout during transcription
   - Very long AI responses

Report any issues found with specific reproduction steps.
```

---

## Step 9: Siri Shortcut Setup Guide for Users

### Goal
Instructions for users to set up Siri Shortcuts.

### Prompt to Copy

```
Create a user-facing help document or in-app guide explaining how to set up Siri Shortcuts for ChefSpAIce.

The guide should include:

1. Prerequisites:
   - iPhone with iOS 13 or later
   - Shortcuts app installed
   - ChefSpAIce account with Pro subscription

2. Generate API Key:
   - Open ChefSpAIce app
   - Go to Settings > Integrations > Siri Shortcuts
   - Tap "Generate API Key"
   - Copy the key (it won't be shown again!)

3. Create "Add to Pantry" Shortcut:
   Step 1: Open Shortcuts app
   Step 2: Tap + to create new shortcut
   Step 3: Add "Ask for Input" action
     - Set prompt to "What do you want to add?"
     - Set input type to "Text"
   Step 4: Add "Get Contents of URL" action
     - URL: https://your-app-url.replit.app/api/external/action
     - Method: POST
     - Request Body: JSON
     - Add fields:
       - apiKey: [paste your API key]
       - action: "add_item"
       - item: [select "Provided Input" from previous step]
   Step 5: Add "Get Dictionary Value" action
     - Get "message" from "Contents of URL"
   Step 6: Add "Speak Text" action
     - Text: [Dictionary Value from previous step]
   Step 7: Name the shortcut "Add to Pantry"
   Step 8: Tap the settings icon, enable "Show in Share Sheet"

4. Create "What's Expiring" Shortcut:
   Similar steps but use action: "what_expires" and no input needed

5. Using with Siri:
   - Say "Hey Siri, Add to Pantry"
   - Siri will ask what to add
   - Say the item name
   - ChefSpAIce adds it and confirms

Include screenshots or illustrations if possible. Add this to the app's settings or help section.
```

---

## Summary

### New Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/voice/speak` | POST | Text-to-speech with AI voice |
| `/api/voice/chat` | POST | Full voice conversation |
| `/api/external/action` | POST | External API for Siri Shortcuts |
| `/api/external/generate-key` | POST | Generate user API key |
| `/api/external/revoke-key` | DELETE | Revoke user API key |

### New Client Hooks

| Hook | Purpose |
|------|---------|
| `useAIVoice` | AI-powered text-to-speech playback |
| `useVoiceChat` | Complete voice conversation management |

### New Components

| Component | Purpose |
|-----------|---------|
| `VoiceQuickAction` | Floating action button for quick voice commands |

### Modified Components

| Component | Changes |
|-----------|---------|
| `ChatModal` | Added voice mode toggle and UI |

---

## Troubleshooting

### Common Issues

1. **Audio not playing on iOS**
   - Check that audio session is configured correctly
   - Ensure app has microphone permissions

2. **Transcription fails**
   - Check audio format is supported (m4a, wav, webm, mp3)
   - Ensure audio is not too short (< 0.5 seconds)
   - Check network connectivity

3. **AI voice sounds robotic**
   - Verify using OpenAI's gpt-audio model, not device TTS
   - Check that TTS endpoint is being called correctly

4. **Siri Shortcut not working**
   - Verify API key is correct
   - Check that URL is accessible from outside
   - Test endpoint directly with curl first

---

## Notes

- OpenAI AI Integrations is already installed and configured
- Uses Replit's built-in API access (no separate API key needed)
- Charges are billed to your Replit credits
- The existing Whisper transcription at `/api/voice/transcribe` works well
