import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTextToSpeech } from "./useTextToSpeech";
import { useVoiceInput } from "./useVoiceInput";
import { parseVoiceCommand, ParsedCommand } from "@/lib/voice-commands";
import { Recipe } from "@/lib/storage";

type ReadingSection =
  | "idle"
  | "title"
  | "description"
  | "ingredients"
  | "instructions";

interface RecipeVoiceState {
  currentStep: number;
  isReading: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  currentSection: ReadingSection;
  speechRate: number;
  handsFreeModeEnabled: boolean;
  lastCommand: string;
}

interface RecipeVoiceNavigationOptions {
  recipe: Recipe | null;
  onStepChange?: (step: number) => void;
  onCommandExecuted?: (command: string) => void;
}

export function useRecipeVoiceNavigation(
  options: RecipeVoiceNavigationOptions,
) {
  const { recipe, onStepChange, onCommandExecuted } = options;

  const [state, setState] = useState<RecipeVoiceState>({
    currentStep: 0,
    isReading: false,
    isSpeaking: false,
    isListening: false,
    isProcessing: false,
    currentSection: "idle",
    speechRate: 1.0,
    handsFreeModeEnabled: false,
    lastCommand: "",
  });

  const stepRefs = useRef<Array<any>>([]);
  const isReadingFullRecipeRef = useRef(false);
  const isMountedRef = useRef(true);

  const updateState = useCallback((updates: Partial<RecipeVoiceState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const {
    isSpeaking,
    isPaused,
    speak,
    speakNow,
    queueMultiple,
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    clearQueue,
    canPause,
  } = useTextToSpeech({
    rate: state.speechRate,
    onStart: () => updateState({ isSpeaking: true }),
    onDone: () => {
      updateState({ isSpeaking: false });
      if (state.handsFreeModeEnabled && isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current && state.handsFreeModeEnabled) {
            startListening();
          }
        }, 500);
      }
    },
  });

  const handleTranscript = useCallback(
    (text: string) => {
      const command = parseVoiceCommand(text, "recipe_detail");
      updateState({ lastCommand: text });
      executeCommand(command);
    },
    [recipe, state.currentStep],
  );

  const {
    isListening,
    isProcessing,
    transcript,
    error: voiceError,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
    clearError,
  } = useVoiceInput({
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    updateState({
      isListening,
      isProcessing,
      isSpeaking,
    });
  }, [isListening, isProcessing, isSpeaking, updateState]);

  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "success" | "error") => {
      if (Platform.OS === "web") return;

      switch (type) {
        case "light":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    },
    [],
  );

  const startListening = useCallback(async () => {
    if (isSpeaking) {
      await stopSpeaking();
    }
    clearError();
    await startVoiceListening();
  }, [isSpeaking, stopSpeaking, clearError, startVoiceListening]);

  const stopListening = useCallback(async () => {
    await stopVoiceListening();
  }, [stopVoiceListening]);

  const goToStep = useCallback(
    (stepNumber: number) => {
      if (!recipe) return;

      const maxStep = recipe.instructions.length;
      const clampedStep = Math.max(0, Math.min(stepNumber, maxStep - 1));

      updateState({ currentStep: clampedStep });
      onStepChange?.(clampedStep);
      triggerHaptic("light");

      speakNow(`Step ${clampedStep + 1}. ${recipe.instructions[clampedStep]}`);
    },
    [recipe, onStepChange, triggerHaptic, speakNow, updateState],
  );

  const nextStep = useCallback(() => {
    if (!recipe) return;

    const maxStep = recipe.instructions.length - 1;
    if (state.currentStep < maxStep) {
      goToStep(state.currentStep + 1);
      onCommandExecuted?.("next");
    } else {
      speakNow("You've reached the last step. The recipe is complete!");
      triggerHaptic("success");
      onCommandExecuted?.("complete");
    }
  }, [
    recipe,
    state.currentStep,
    goToStep,
    speakNow,
    triggerHaptic,
    onCommandExecuted,
  ]);

  const previousStep = useCallback(() => {
    if (!recipe) return;

    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
      onCommandExecuted?.("previous");
    } else {
      speakNow("You're at the first step.");
      triggerHaptic("light");
    }
  }, [
    recipe,
    state.currentStep,
    goToStep,
    speakNow,
    triggerHaptic,
    onCommandExecuted,
  ]);

  const repeatStep = useCallback(() => {
    if (!recipe) return;

    speakNow(
      `Step ${state.currentStep + 1}. ${recipe.instructions[state.currentStep]}`,
    );
    onCommandExecuted?.("repeat");
    triggerHaptic("light");
  }, [recipe, state.currentStep, speakNow, triggerHaptic, onCommandExecuted]);

  const readRecipe = useCallback(() => {
    if (!recipe) return;

    isReadingFullRecipeRef.current = true;
    updateState({ isReading: true, currentSection: "title" });

    const textToRead: string[] = [];

    textToRead.push(`Recipe: ${recipe.title}.`);
    textToRead.push(`${recipe.description}`);

    const ingredientsList = recipe.ingredients
      .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`)
      .join(", ");
    textToRead.push(`Ingredients: ${ingredientsList}`);

    textToRead.push(`Now for the instructions.`);
    recipe.instructions.forEach((instruction, index) => {
      textToRead.push(`Step ${index + 1}. ${instruction}`);
    });

    textToRead.push("Recipe complete. Enjoy your meal!");

    queueMultiple(textToRead);
    onCommandExecuted?.("read_recipe");
    triggerHaptic("medium");
  }, [recipe, queueMultiple, updateState, triggerHaptic, onCommandExecuted]);

  const readIngredients = useCallback(() => {
    if (!recipe) return;

    updateState({ currentSection: "ingredients" });

    const ingredientTexts = recipe.ingredients.map(
      (ing, index) => `${index + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`,
    );

    speakNow(`Ingredients for ${recipe.title}.`);
    setTimeout(() => {
      queueMultiple(ingredientTexts);
    }, 100);

    onCommandExecuted?.("read_ingredients");
    triggerHaptic("light");
  }, [
    recipe,
    speakNow,
    queueMultiple,
    updateState,
    triggerHaptic,
    onCommandExecuted,
  ]);

  const stopReading = useCallback(() => {
    isReadingFullRecipeRef.current = false;
    stopSpeaking();
    clearQueue();
    updateState({ isReading: false, currentSection: "idle" });
    onCommandExecuted?.("stop");
    triggerHaptic("light");
  }, [stopSpeaking, clearQueue, updateState, triggerHaptic, onCommandExecuted]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeSpeaking();
      onCommandExecuted?.("resume");
    } else {
      pauseSpeaking();
      onCommandExecuted?.("pause");
    }
    triggerHaptic("light");
  }, [
    isPaused,
    pauseSpeaking,
    resumeSpeaking,
    triggerHaptic,
    onCommandExecuted,
  ]);

  const setSpeechRate = useCallback(
    (rate: number) => {
      const clampedRate = Math.max(0.5, Math.min(2.0, rate));
      updateState({ speechRate: clampedRate });
      triggerHaptic("light");
    },
    [updateState, triggerHaptic],
  );

  const increaseSpeechRate = useCallback(() => {
    const newRate = Math.min(2.0, state.speechRate + 0.25);
    setSpeechRate(newRate);
    speakNow(`Speed increased to ${newRate.toFixed(1)}x`);
  }, [state.speechRate, setSpeechRate, speakNow]);

  const decreaseSpeechRate = useCallback(() => {
    const newRate = Math.max(0.5, state.speechRate - 0.25);
    setSpeechRate(newRate);
    speakNow(`Speed decreased to ${newRate.toFixed(1)}x`);
  }, [state.speechRate, setSpeechRate, speakNow]);

  const toggleHandsFreeMode = useCallback(() => {
    const newValue = !state.handsFreeModeEnabled;
    updateState({ handsFreeModeEnabled: newValue });

    if (newValue) {
      speakNow(
        "Hands-free mode enabled. Say 'next' when ready for the next step.",
      );
      triggerHaptic("success");
    } else {
      speakNow("Hands-free mode disabled.");
      triggerHaptic("light");
    }
    onCommandExecuted?.("toggle_hands_free");
  }, [
    state.handsFreeModeEnabled,
    speakNow,
    updateState,
    triggerHaptic,
    onCommandExecuted,
  ]);

  const executeCommand = useCallback(
    (command: ParsedCommand) => {
      if (!recipe) return;

      switch (command.intent) {
        case "NEXT_STEP":
          nextStep();
          break;

        case "PREVIOUS_STEP":
          previousStep();
          break;

        case "REPEAT_STEP":
          repeatStep();
          break;

        case "GO_TO_STEP":
          if (command.entities.stepNumber !== undefined) {
            const targetStep = Number(command.entities.stepNumber) - 1;
            goToStep(targetStep);
          }
          break;

        case "READ_RECIPE":
          readRecipe();
          break;

        case "READ_INGREDIENTS":
          readIngredients();
          break;

        case "STOP":
          stopReading();
          break;

        case "PAUSE":
          if (canPause) {
            togglePause();
          }
          break;

        case "FASTER":
          increaseSpeechRate();
          break;

        case "SLOWER":
          decreaseSpeechRate();
          break;

        case "HELP":
          speakNow(
            "Available commands: say 'next' for next step, 'back' for previous step, 'repeat' to hear again, 'go to step' followed by a number, 'read recipe' to hear the full recipe, or 'stop' to stop reading.",
          );
          break;

        case "UNKNOWN":
        default:
          speakNow(
            "Sorry, I didn't understand. Try saying 'next', 'back', 'repeat', or 'help'.",
          );
          triggerHaptic("error");
          break;
      }
    },
    [
      recipe,
      nextStep,
      previousStep,
      repeatStep,
      goToStep,
      readRecipe,
      readIngredients,
      stopReading,
      togglePause,
      increaseSpeechRate,
      decreaseSpeechRate,
      canPause,
      speakNow,
      triggerHaptic,
    ],
  );

  const promptForNextStep = useCallback(() => {
    if (state.handsFreeModeEnabled) {
      speakNow("Say 'next' when you're ready for the next step.");
    }
  }, [state.handsFreeModeEnabled, speakNow]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeaking();
      clearQueue();
    };
  }, []);

  return {
    currentStep: state.currentStep,
    totalSteps: recipe?.instructions.length || 0,
    isReading: state.isReading,
    isSpeaking: state.isSpeaking || isSpeaking,
    isPaused,
    isListening: state.isListening || isListening,
    isProcessing: state.isProcessing || isProcessing,
    currentSection: state.currentSection,
    speechRate: state.speechRate,
    handsFreeModeEnabled: state.handsFreeModeEnabled,
    lastCommand: state.lastCommand,
    transcript,
    voiceError,

    nextStep,
    previousStep,
    repeatStep,
    goToStep,
    readRecipe,
    readIngredients,
    stopReading,
    togglePause,
    setSpeechRate,
    increaseSpeechRate,
    decreaseSpeechRate,
    toggleHandsFreeMode,
    startListening,
    stopListening,
    clearError,
    promptForNextStep,
    executeCommand,
    canPause,
  };
}

export type { RecipeVoiceState, RecipeVoiceNavigationOptions };
