import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  suggestions?: Array<{
    value: string;
    confidence: number;
    reasoning: string;
    action?: string;
  }>;
  formatHints?: string[];
  quickFixes?: Array<{
    label: string;
    value: string;
    action: string;
  }>;
}

interface ValidationState {
  [fieldName: string]: {
    value: string;
    result?: ValidationResult;
    isValidating: boolean;
    hasBeenValidated: boolean;
  };
}

export function useSmartValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({});
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const resolutionStartTime = useRef<{ [key: string]: number }>({});

  // Mutation for field validation
  const validateFieldMutation = useMutation({
    mutationFn: async (params: {
      fieldName: string;
      fieldType: string;
      value: string;
      context?: any;
    }) => {
      const response = await apiRequest("/api/validate/field", "POST", params);
      return response;
    },
  });

  // Mutation for form validation
  const validateFormMutation = useMutation({
    mutationFn: async (params: {
      formId: string;
      fields: Array<{ name: string; type: string; value: string; required?: boolean }>;
      context?: any;
    }) => {
      const response = await apiRequest("/api/validate/form", "POST", params);
      return response;
    },
  });

  // Mutation for learning from corrections
  const learnFromCorrectionMutation = useMutation({
    mutationFn: async (params: {
      fieldName: string;
      fieldType: string;
      originalValue: string;
      suggestedValue?: string;
      finalValue: string;
      userResolution: "accepted_suggestion" | "manual_correction" | "ignored" | "abandoned";
      context?: any;
      resolutionTime?: number;
    }) => {
      const response = await apiRequest("/api/validate/learn", "POST", params);
      return response;
    },
  });

  /**
   * Validate a single field with debouncing
   */
  const validateField = useCallback(
    async (
      fieldName: string,
      fieldType: string,
      value: string,
      options?: {
        debounce?: number;
        context?: any;
        immediate?: boolean;
      }
    ) => {
      const { debounce = 500, context, immediate } = options || {};

      // Clear existing debounce timer
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      // Update state immediately with the value
      setValidationState(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
          isValidating: !immediate,
        },
      }));

      // Start resolution timer
      resolutionStartTime.current[fieldName] = Date.now();

      // Validate after debounce or immediately
      const validate = async () => {
        setValidationState(prev => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValidating: true,
          },
        }));

        try {
          const result = await validateFieldMutation.mutateAsync({
            fieldName,
            fieldType,
            value,
            context,
          });

          setValidationState(prev => ({
            ...prev,
            [fieldName]: {
              value,
              result,
              isValidating: false,
              hasBeenValidated: true,
            },
          }));

          return result;
        } catch (error) {
          console.error("Validation error:", error);
          setValidationState(prev => ({
            ...prev,
            [fieldName]: {
              ...prev[fieldName],
              isValidating: false,
              hasBeenValidated: true,
            },
          }));
        }
      };

      if (immediate) {
        return validate();
      } else {
        debounceTimers.current[fieldName] = setTimeout(validate, debounce);
      }
    },
    [validateFieldMutation]
  );

  /**
   * Validate an entire form
   */
  const validateForm = useCallback(
    async (
      formId: string,
      fields: Array<{ name: string; type: string; value: string; required?: boolean }>,
      context?: any
    ) => {
      const result = await validateFormMutation.mutateAsync({
        formId,
        fields,
        context,
      });

      // Update state for all fields
      if (result.fields) {
        setValidationState(prev => {
          const newState = { ...prev };
          for (const field of fields) {
            newState[field.name] = {
              value: field.value,
              result: result.fields[field.name],
              isValidating: false,
              hasBeenValidated: true,
            };
          }
          return newState;
        });
      }

      return result;
    },
    [validateFormMutation]
  );

  /**
   * Apply a suggestion to a field
   */
  const applySuggestion = useCallback(
    async (
      fieldName: string,
      fieldType: string,
      suggestedValue: string,
      action?: string
    ) => {
      const originalValue = validationState[fieldName]?.value || "";
      const resolutionTime = resolutionStartTime.current[fieldName]
        ? Date.now() - resolutionStartTime.current[fieldName]
        : undefined;

      // Learn from the correction
      await learnFromCorrectionMutation.mutateAsync({
        fieldName,
        fieldType,
        originalValue,
        suggestedValue,
        finalValue: suggestedValue,
        userResolution: "accepted_suggestion",
        resolutionTime,
      });

      // Update the field value and clear validation
      setValidationState(prev => ({
        ...prev,
        [fieldName]: {
          value: suggestedValue,
          result: { isValid: true },
          isValidating: false,
          hasBeenValidated: true,
        },
      }));

      return suggestedValue;
    },
    [validationState, learnFromCorrectionMutation]
  );

  /**
   * Record manual correction
   */
  const recordManualCorrection = useCallback(
    async (
      fieldName: string,
      fieldType: string,
      finalValue: string
    ) => {
      const originalValue = validationState[fieldName]?.value || "";
      const resolutionTime = resolutionStartTime.current[fieldName]
        ? Date.now() - resolutionStartTime.current[fieldName]
        : undefined;

      await learnFromCorrectionMutation.mutateAsync({
        fieldName,
        fieldType,
        originalValue,
        finalValue,
        userResolution: "manual_correction",
        resolutionTime,
      });
    },
    [validationState, learnFromCorrectionMutation]
  );

  /**
   * Clear validation for a field
   */
  const clearValidation = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  /**
   * Clear all validations
   */
  const clearAllValidations = useCallback(() => {
    setValidationState({});
    // Clear all debounce timers
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
  }, []);

  /**
   * Get validation state for a field
   */
  const getFieldState = useCallback(
    (fieldName: string) => {
      return validationState[fieldName] || {
        value: "",
        result: undefined,
        isValidating: false,
        hasBeenValidated: false,
      };
    },
    [validationState]
  );

  /**
   * Check if form is valid
   */
  const isFormValid = useCallback(() => {
    const fields = Object.values(validationState);
    return fields.every(field => !field.result || field.result.isValid);
  }, [validationState]);

  return {
    validateField,
    validateForm,
    applySuggestion,
    recordManualCorrection,
    clearValidation,
    clearAllValidations,
    getFieldState,
    isFormValid,
    validationState,
    isValidating: validateFieldMutation.isPending || validateFormMutation.isPending,
  };
}