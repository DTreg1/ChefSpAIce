/**
 * Auto-Save Hook with TensorFlow.js Pause Detection
 * 
 * Intelligently detects typing pauses and triggers auto-save
 * based on learned user patterns and content analysis.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AutoSaveOptions {
  documentId: string;
  documentType?: 'chat' | 'recipe' | 'note' | 'meal_plan' | 'shopping_list' | 'other';
  minInterval?: number; // Minimum time between saves (ms)
  maxInterval?: number; // Maximum time between saves (ms)
  onSave?: (content: string) => void;
  onRestore?: (content: string) => void;
  onConflict?: (localContent: string, remoteContent: string) => string;
}

interface TypingPattern {
  pauseDurations: number[];
  burstLengths: number[];
  keyIntervals: number[];
  lastKeyTime: number;
  currentBurstLength: number;
}

/**
 * Custom hook for intelligent auto-save with TensorFlow.js
 */
export function useAutoSave(
  content: string,
  options: AutoSaveOptions
) {
  const {
    documentId,
    documentType = 'other',
    minInterval = 2000,
    maxInterval = 30000,
    onSave,
    onRestore,
    onConflict,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Refs for tracking state without re-renders
  const contentRef = useRef(content);
  const lastSaveRef = useRef('');
  const lastSaveTimeRef = useRef(0);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modelRef = useRef<tf.LayersModel | null>(null);
  const patternRef = useRef<TypingPattern>({
    pauseDurations: [],
    burstLengths: [],
    keyIntervals: [],
    lastKeyTime: 0,
    currentBurstLength: 0,
  });

  // State for UI feedback
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Define user patterns type
  interface UserPatternsData {
    avgPauseDuration?: number;
    sentencePauseDuration?: number;
    paragraphPauseDuration?: number;
    modelWeights?: any[];
  }

  // Fetch user's typing patterns
  const { data: userPatterns } = useQuery<UserPatternsData>({
    queryKey: ['/api/autosave/patterns'],
    enabled: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutation for saving drafts
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/autosave/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save draft');
      return response.json();
    },
    onSuccess: (result) => {
      setIsSaving(false);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastSaveRef.current = contentRef.current;
      lastSaveTimeRef.current = Date.now();
      onSave?.(contentRef.current);
      
      // Invalidate versions query
      queryClient.invalidateQueries({
        queryKey: ['/api/autosave/versions', documentId],
      });
    },
    onError: (error) => {
      setIsSaving(false);
      console.error('Auto-save failed:', error);
      // Don't show toast for auto-save failures to avoid interrupting user
    },
  });

  // Mutation for recording typing events
  const recordEventMutation = useMutation({
    mutationFn: async (event: any) =>
      apiRequest('/api/autosave/typing-event', 'POST', event),
  });

  // Initialize TensorFlow.js model
  useEffect(() => {
    const initModel = async () => {
      try {
        // Create a simple model for pause detection
        const model = tf.sequential({
          layers: [
            tf.layers.dense({
              inputShape: [5], // pauseDuration, burstLength, timeSinceLastSave, contentLength, isPunctuationEnd
              units: 8,
              activation: 'relu',
            }),
            tf.layers.dense({
              units: 4,
              activation: 'relu',
            }),
            tf.layers.dense({
              units: 1,
              activation: 'sigmoid', // Output probability of needing save
            }),
          ],
        });

        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'binaryCrossentropy',
          metrics: ['accuracy'],
        });

        modelRef.current = model;

        // Load pre-trained weights if available from user patterns
        if (userPatterns?.modelWeights) {
          try {
            const savedWeights = userPatterns.modelWeights;
            if (Array.isArray(savedWeights) && savedWeights.length > 0) {
              // Convert saved weights back to tensors
              const tensorWeights = savedWeights.map((weightData: any) => {
                if (weightData && weightData.shape && weightData.values) {
                  return tf.tensor(weightData.values, weightData.shape);
                }
                return null;
              }).filter((t): t is tf.Tensor => t !== null);
              
              if (tensorWeights.length > 0) {
                // Load the weights into the model
                model.setWeights(tensorWeights);
                console.log('Successfully loaded saved model weights');
              }
            }
          } catch (error) {
            console.error('Failed to load model weights:', error);
          }
        }
      } catch (error) {
        console.error('Failed to initialize TensorFlow model:', error);
      }
    };

    initModel();

    return () => {
      // Clean up model on unmount
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, [userPatterns]);

  // Calculate content hash
  const calculateHash = useCallback(async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }, []);

  // Predict if save is needed using TensorFlow.js
  const shouldSave = useCallback(async (pauseDuration: number): Promise<boolean> => {
    if (!modelRef.current) {
      // Fallback to simple heuristic if model not loaded
      const avgPause = userPatterns?.avgPauseDuration || 2000;
      const sentencePause = userPatterns?.sentencePauseDuration || 2500;
      const paragraphPause = userPatterns?.paragraphPauseDuration || 4000;

      // Check if pause is significant
      if (pauseDuration > paragraphPause) return true;
      if (pauseDuration > sentencePause && contentRef.current.endsWith('.')) return true;
      if (pauseDuration > avgPause * 1.5) return true;

      return false;
    }

    try {
      // Prepare input features
      const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
      const contentLength = contentRef.current.length;
      const isPunctuationEnd = /[.!?]$/.test(contentRef.current.trim()) ? 1 : 0;
      const currentBurst = patternRef.current.currentBurstLength;

      // Normalize features
      const features = tf.tensor2d([[
        pauseDuration / 5000, // Normalize to 0-1 (assuming max 5 seconds)
        currentBurst / 100,   // Normalize burst length
        Math.min(timeSinceLastSave / maxInterval, 1), // Time since last save
        Math.min(contentLength / 10000, 1), // Content length
        isPunctuationEnd,
      ]]);

      // Get prediction
      const prediction = modelRef.current.predict(features) as tf.Tensor;
      const probability = await prediction.data();
      
      features.dispose();
      prediction.dispose();

      // Save if probability > 0.5
      return probability[0] > 0.5;
    } catch (error) {
      console.error('Model prediction failed:', error);
      // Fallback to simple heuristic
      return pauseDuration > (userPatterns?.avgPauseDuration || 2000) * 1.5;
    }
  }, [userPatterns, maxInterval]);

  // Perform auto-save
  const performAutoSave = useCallback(async () => {
    if (isSaving || contentRef.current === lastSaveRef.current) {
      return; // Skip if already saving or no changes
    }

    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    if (timeSinceLastSave < minInterval) {
      return; // Too soon since last save
    }

    setIsSaving(true);

    try {
      const contentHash = await calculateHash(contentRef.current);

      // Check for conflicts
      const conflictCheck = await apiRequest('/api/autosave/check-conflicts', 'POST', {
        documentId,
        contentHash,
      });

      let finalContent = contentRef.current;
      let conflictResolved = false;

      if (conflictCheck.hasConflict && conflictCheck.latestVersion) {
        // Handle conflict
        if (onConflict) {
          finalContent = onConflict(contentRef.current, conflictCheck.latestVersion.content);
          conflictResolved = true;
        } else {
          // Default: Keep local changes
          toast({
            title: "Conflict detected",
            description: "Your changes have been preserved. Review version history if needed.",
            variant: "default",
          });
        }
      }

      // Get cursor position and other metadata
      const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
      const cursorPosition = activeElement?.selectionStart || 0;
      const scrollPosition = window.scrollY;

      // Save the draft
      await saveDraftMutation.mutateAsync({
        documentId,
        documentType,
        content: finalContent,
        metadata: {
          cursorPosition,
          scrollPosition,
          deviceInfo: {
            browser: navigator.userAgent,
            screenSize: `${window.screen.width}x${window.screen.height}`,
          },
        },
        isAutoSave: true,
        conflictResolved,
      });

    } catch (error) {
      console.error('Auto-save error:', error);
      setIsSaving(false);
    }
  }, [
    documentId,
    documentType,
    minInterval,
    isSaving,
    saveDraftMutation,
    calculateHash,
    onConflict,
    toast,
  ]);

  // Handle typing events and detect pauses
  const handleTyping = useCallback(() => {
    const now = Date.now();
    const pattern = patternRef.current;

    // Calculate pause duration
    if (pattern.lastKeyTime > 0) {
      const pauseDuration = now - pattern.lastKeyTime;
      
      // If pause is significant, check if we should save
      if (pauseDuration > 500) { // Min pause threshold
        pattern.pauseDurations.push(pauseDuration);
        pattern.currentBurstLength = 0;

        // Check if save is needed
        shouldSave(pauseDuration).then(shouldPerformSave => {
          if (shouldPerformSave) {
            performAutoSave();
          }
        });

        // Record typing event
        const isSentenceEnd = /[.!?]$/.test(contentRef.current.trim());
        const isParagraphEnd = /\n\n$/.test(contentRef.current);
        
        recordEventMutation.mutate({
          pauseDuration,
          burstLength: pattern.currentBurstLength,
          isSentenceEnd,
          isParagraphEnd,
          wasManualSave: false,
        });
      } else {
        // Still typing in burst
        pattern.currentBurstLength++;
        pattern.keyIntervals.push(pauseDuration);
      }
    }

    pattern.lastKeyTime = now;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for max interval save
    saveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, maxInterval);

    // Update unsaved changes state
    if (contentRef.current !== lastSaveRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [shouldSave, performAutoSave, maxInterval, recordEventMutation]);

  // Update content ref and trigger typing handler
  useEffect(() => {
    contentRef.current = content;
    handleTyping();
  }, [content, handleTyping]);

  // Restore draft on mount if available
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const response = await apiRequest(`/api/autosave/restore?documentId=${documentId}`, 'GET');
        if (response.draft && response.draft.content !== content) {
          onRestore?.(response.draft.content);
          lastSaveRef.current = response.draft.content;
          
          toast({
            title: "Draft restored",
            description: "Your previous work has been restored.",
            variant: "default",
          });
        }
      } catch (error) {
        // No draft available, which is fine
      }
    };

    restoreDraft();
  }, [documentId, onRestore, toast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Perform final save if there are unsaved changes
      if (contentRef.current !== lastSaveRef.current) {
        performAutoSave();
      }
    };
  }, [performAutoSave]);

  // Manual save function
  const manualSave = useCallback(async () => {
    await performAutoSave();
    
    // Record as manual save for pattern learning
    recordEventMutation.mutate({
      wasManualSave: true,
    });
    
    toast({
      title: "Saved",
      description: "Your work has been saved.",
      variant: "default",
    });
  }, [performAutoSave, recordEventMutation, toast]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    manualSave,
  };
}