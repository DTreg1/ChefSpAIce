import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VoiceSettings {
  selectedVoice?: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
}

interface VoiceSettingsContextType {
  voiceSettings: VoiceSettings;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;
  setSpeechVolume: (volume: number) => void;
  isSaving: boolean;
  speechSynthesisAvailable: boolean;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if speech synthesis is available
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState(false);
  
  // Default settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    selectedVoice: undefined,
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 1.0,
  });
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  // Check for speech synthesis availability
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSpeechSynthesisAvailable(true);
    }
  }, []);

  // Load voice settings from user profile
  useEffect(() => {
    if (user?.voiceSettings) {
      setVoiceSettings({
        selectedVoice: user.voiceSettings.selectedVoice,
        speechRate: user.voiceSettings.speechRate ?? 1.0,
        speechPitch: user.voiceSettings.speechPitch ?? 1.0,
        speechVolume: user.voiceSettings.speechVolume ?? 1.0,
      });
    }
  }, [user]);

  // Load available voices
  useEffect(() => {
    if (!speechSynthesisAvailable) return;
    
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to find the saved voice or select a default
      if (availableVoices.length > 0) {
        let voiceToSelect = null;
        
        // First try to find the saved voice
        if (voiceSettings.selectedVoice) {
          voiceToSelect = availableVoices.find(v => v.name === voiceSettings.selectedVoice);
        }
        
        // If not found, try to select a natural-sounding English voice
        if (!voiceToSelect) {
          voiceToSelect = availableVoices.find(voice => 
            voice.lang.startsWith('en') && voice.name.includes('Natural')
          ) || availableVoices.find(voice => 
            voice.lang.startsWith('en')
          ) || availableVoices[0];
        }
        
        setSelectedVoice(voiceToSelect);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [voiceSettings.selectedVoice, speechSynthesisAvailable]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: VoiceSettings) => {
      const response = await apiRequest("PUT", "/api/user/preferences", {
        voiceSettings: settings,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save voice settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update voice settings
  const updateVoiceSettings = (partialSettings: Partial<VoiceSettings>) => {
    const newSettings = { ...voiceSettings, ...partialSettings };
    setVoiceSettings(newSettings);
    saveMutation.mutate(newSettings);
  };

  const handleSetSelectedVoice = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    if (voice) {
      updateVoiceSettings({ selectedVoice: voice.name });
    }
  };

  const setSpeechRate = (rate: number) => {
    updateVoiceSettings({ speechRate: rate });
  };

  const setSpeechPitch = (pitch: number) => {
    updateVoiceSettings({ speechPitch: pitch });
  };

  const setSpeechVolume = (volume: number) => {
    updateVoiceSettings({ speechVolume: volume });
  };

  return (
    <VoiceSettingsContext.Provider
      value={{
        voiceSettings,
        voices,
        selectedVoice,
        updateVoiceSettings,
        setSelectedVoice: handleSetSelectedVoice,
        setSpeechRate,
        setSpeechPitch,
        setSpeechVolume,
        isSaving: saveMutation.isPending,
        speechSynthesisAvailable,
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error("useVoiceSettings must be used within a VoiceSettingsProvider");
  }
  return context;
}