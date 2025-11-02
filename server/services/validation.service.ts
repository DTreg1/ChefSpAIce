import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { validationRules, validationErrors, ValidationRule, ValidationError } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common phone number patterns for different countries
const PHONE_PATTERNS = {
  US: {
    regex: /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    format: "(xxx) xxx-xxxx",
    countryCode: "+1",
    minDigits: 10,
    maxDigits: 10,
  },
  INTERNATIONAL: {
    regex: /^\+[1-9]\d{1,14}$/,
    format: "+[country code] [number]",
    countryCode: "",
    minDigits: 7,
    maxDigits: 15,
  },
};

// Common validation patterns
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  date: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
};

interface ValidateFieldParams {
  fieldName: string;
  fieldType: string;
  value: string;
  userId?: string;
  context?: {
    formId?: string;
    otherFields?: Record<string, any>;
    locale?: string;
  };
}

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

class ValidationService {
  /**
   * Validate a single field with AI-powered suggestions
   */
  async validateField(params: ValidateFieldParams): Promise<ValidationResult> {
    const { fieldName, fieldType, value, userId, context } = params;

    // Get validation rules for this field type
    const rules = await this.getRulesForFieldType(fieldType);
    
    // Start with basic validation
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      suggestions: [],
      formatHints: [],
      quickFixes: [],
    };

    // Special handling for phone numbers
    if (fieldType === "phone") {
      const phoneResult = await this.validatePhoneNumber(value, context?.locale);
      return phoneResult;
    }

    // Apply regex patterns
    if (VALIDATION_PATTERNS[fieldType as keyof typeof VALIDATION_PATTERNS]) {
      const pattern = VALIDATION_PATTERNS[fieldType as keyof typeof VALIDATION_PATTERNS];
      if (!pattern.test(value)) {
        result.isValid = false;
        result.errors?.push(`Invalid ${fieldType} format`);
      }
    }

    // Apply custom rules from database
    for (const rule of rules) {
      const ruleResult = await this.applyRule(rule, value, context);
      if (!ruleResult.isValid) {
        result.isValid = false;
        result.errors?.push(...(ruleResult.errors || []));
      }
      result.suggestions?.push(...(ruleResult.suggestions || []));
      result.formatHints?.push(...(ruleResult.formatHints || []));
      result.quickFixes?.push(...(ruleResult.quickFixes || []));
    }

    // Get AI suggestions if validation failed
    if (!result.isValid && rules.some(r => r.aiConfig?.useAI)) {
      const aiSuggestions = await this.getAISuggestions(fieldType, value, result.errors?.[0], context);
      result.suggestions?.push(...aiSuggestions);
    }

    // Track validation error for learning
    if (!result.isValid && userId) {
      await this.trackValidationError({
        userId,
        fieldName,
        fieldType,
        originalValue: value,
        errorType: "format",
        context,
      });
    }

    return result;
  }

  /**
   * Special validation for phone numbers with intelligent suggestions
   */
  private async validatePhoneNumber(value: string, locale?: string): Promise<ValidationResult> {
    const cleanValue = value.replace(/[\s\-\(\)\.]/g, "");
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      suggestions: [],
      formatHints: ["Enter as (555) 123-4567 or 555-123-4567"],
      quickFixes: [],
    };

    // Check if it's too short (missing area code)
    if (cleanValue.length === 7) {
      result.errors?.push("Phone number is missing an area code");
      
      // Suggest common area codes based on locale or provide generic suggestions
      const commonAreaCodes = ["212", "310", "415", "312", "202"];
      for (const areaCode of commonAreaCodes.slice(0, 3)) {
        const formattedNumber = `(${areaCode}) ${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
        result.suggestions?.push({
          value: formattedNumber,
          confidence: 0.7,
          reasoning: `Added area code ${areaCode} for a complete US phone number`,
          action: "add_area_code",
        });
        result.quickFixes?.push({
          label: `Add area code ${areaCode}`,
          value: formattedNumber,
          action: "apply_suggestion",
        });
      }
      
      return result;
    }

    // Check if it's a valid US number
    if (cleanValue.length === 10 && PHONE_PATTERNS.US.regex.test(value)) {
      result.isValid = true;
      
      // Offer formatting suggestions
      const formatted = `(${cleanValue.slice(0, 3)}) ${cleanValue.slice(3, 6)}-${cleanValue.slice(6)}`;
      if (value !== formatted) {
        result.quickFixes?.push({
          label: "Format as US number",
          value: formatted,
          action: "format",
        });
      }
      
      return result;
    }

    // Check if it's an international number
    if (cleanValue.startsWith("+") || cleanValue.length > 10) {
      if (PHONE_PATTERNS.INTERNATIONAL.regex.test(cleanValue)) {
        result.isValid = true;
        result.formatHints = ["International format detected"];
      } else {
        result.errors?.push("Invalid international phone number format");
        result.formatHints = ["Use format: +[country code] [number]"];
      }
      
      return result;
    }

    // Invalid format
    result.errors?.push("Invalid phone number format");
    
    // Try to detect what they might have meant
    if (cleanValue.length === 11 && cleanValue.startsWith("1")) {
      // US number with country code
      const formatted = `+1 (${cleanValue.slice(1, 4)}) ${cleanValue.slice(4, 7)}-${cleanValue.slice(7)}`;
      result.suggestions?.push({
        value: formatted,
        confidence: 0.9,
        reasoning: "Detected US number with country code",
        action: "format_with_country_code",
      });
      result.quickFixes?.push({
        label: "Format as +1 US number",
        value: formatted,
        action: "apply_suggestion",
      });
    }

    return result;
  }

  /**
   * Apply a single validation rule
   */
  private async applyRule(rule: ValidationRule, value: string, context?: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      suggestions: [],
      formatHints: rule.suggestions?.formatHints || [],
      quickFixes: [],
    };

    // Check length constraints
    if (rule.rules?.lengthConstraints) {
      const { min, max } = rule.rules.lengthConstraints;
      if (min && value.length < min) {
        result.isValid = false;
        result.errors?.push(rule.errorMessages?.tooShort || `Must be at least ${min} characters`);
      }
      if (max && value.length > max) {
        result.isValid = false;
        result.errors?.push(rule.errorMessages?.tooLong || `Must be no more than ${max} characters`);
      }
    }

    // Check regex patterns
    if (rule.rules?.patterns) {
      let matched = false;
      for (const pattern of rule.rules.patterns) {
        const regex = new RegExp(pattern.regex, pattern.flags);
        if (regex.test(value)) {
          matched = true;
          break;
        }
      }
      if (!matched && rule.rules.patterns.length > 0) {
        result.isValid = false;
        result.errors?.push(rule.errorMessages?.invalidFormat || rule.errorMessages?.default || "Invalid format");
      }
    }

    // Add quick fixes from rule suggestions
    if (rule.suggestions?.quickFixes) {
      result.quickFixes = rule.suggestions.quickFixes.map(fix => ({
        ...fix,
        value: fix.value || value,
      }));
    }

    return result;
  }

  /**
   * Get AI-powered suggestions using GPT-3.5
   */
  private async getAISuggestions(
    fieldType: string,
    value: string,
    error?: string,
    context?: any
  ): Promise<Array<{ value: string; confidence: number; reasoning: string }>> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("[Validation] OpenAI API key not configured");
        return [];
      }

      const prompt = `You are a helpful form validation assistant. The user entered "${value}" for a ${fieldType} field, but it's invalid.
${error ? `Error: ${error}` : ""}
${context?.otherFields ? `Other form fields: ${JSON.stringify(context.otherFields)}` : ""}

Suggest up to 3 corrections that would make this input valid. For each suggestion, provide:
1. The corrected value
2. A confidence score (0-1)
3. Brief reasoning

Format your response as JSON array: [{"value": "...", "confidence": 0.9, "reasoning": "..."}]`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a form validation expert. Provide helpful, accurate suggestions for correcting invalid form inputs.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch (e) {
          console.error("[Validation] Failed to parse AI response:", e);
        }
      }
    } catch (error) {
      console.error("[Validation] AI suggestion error:", error);
    }

    return [];
  }

  /**
   * Validate an entire form with field interdependencies
   */
  async validateForm(params: {
    formId: string;
    fields: Array<{ name: string; type: string; value: string; required?: boolean }>;
    userId?: string;
    context?: any;
  }) {
    const results: Record<string, ValidationResult> = {};
    const formContext = {
      ...params.context,
      formId: params.formId,
      otherFields: params.fields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {} as Record<string, string>),
    };

    // Validate each field
    for (const field of params.fields) {
      // Check required fields
      if (field.required && !field.value) {
        results[field.name] = {
          isValid: false,
          errors: ["This field is required"],
        };
        continue;
      }

      // Skip empty optional fields
      if (!field.required && !field.value) {
        results[field.name] = { isValid: true };
        continue;
      }

      // Validate the field
      results[field.name] = await this.validateField({
        fieldName: field.name,
        fieldType: field.type,
        value: field.value,
        userId: params.userId,
        context: formContext,
      });
    }

    const isFormValid = Object.values(results).every(r => r.isValid);

    return {
      isValid: isFormValid,
      fields: results,
      summary: {
        totalFields: params.fields.length,
        validFields: Object.values(results).filter(r => r.isValid).length,
        invalidFields: Object.values(results).filter(r => !r.isValid).length,
      },
    };
  }

  /**
   * Get suggestions for fixing a validation error
   */
  async getSuggestions(params: {
    fieldType: string;
    currentValue: string;
    errorType?: string;
    userId?: string;
    context?: any;
  }) {
    const suggestions = await this.getAISuggestions(
      params.fieldType,
      params.currentValue,
      params.errorType,
      params.context
    );

    return {
      suggestions,
      formatHints: VALIDATION_PATTERNS[params.fieldType as keyof typeof VALIDATION_PATTERNS]
        ? [`Format: ${params.fieldType}`]
        : [],
    };
  }

  /**
   * Learn from user corrections to improve future validation
   */
  async learnFromCorrection(params: {
    fieldName: string;
    fieldType: string;
    originalValue: string;
    suggestedValue?: string;
    finalValue: string;
    userResolution: "accepted_suggestion" | "manual_correction" | "ignored" | "abandoned";
    userId?: string;
    context?: any;
    resolutionTime?: number;
  }) {
    // Track the validation error and resolution
    await db.insert(validationErrors).values({
      userId: params.userId,
      fieldName: params.fieldName,
      fieldType: params.fieldType,
      errorType: "format",
      originalValue: params.originalValue,
      suggestedValue: params.suggestedValue,
      finalValue: params.finalValue,
      userResolution: params.userResolution,
      context: params.context,
      resolutionTime: params.resolutionTime,
      frequency: 1,
    });

    // TODO: Implement ML model training based on corrections
    // This could involve:
    // 1. Analyzing patterns in corrections
    // 2. Updating validation rules
    // 3. Improving AI suggestion prompts
  }

  /**
   * Get validation rules for a specific field type
   */
  async getRulesForFieldType(fieldType: string): Promise<ValidationRule[]> {
    const rules = await db
      .select()
      .from(validationRules)
      .where(and(eq(validationRules.fieldType, fieldType), eq(validationRules.isActive, true)))
      .orderBy(desc(validationRules.priority));

    return rules;
  }

  /**
   * Get user validation statistics
   */
  async getUserValidationStats(userId: string) {
    const errors = await db
      .select()
      .from(validationErrors)
      .where(eq(validationErrors.userId, userId))
      .orderBy(desc(validationErrors.createdAt))
      .limit(100);

    const stats = {
      totalErrors: errors.length,
      acceptedSuggestions: errors.filter(e => e.userResolution === "accepted_suggestion").length,
      manualCorrections: errors.filter(e => e.userResolution === "manual_correction").length,
      ignoredErrors: errors.filter(e => e.userResolution === "ignored").length,
      abandonedForms: errors.filter(e => e.userResolution === "abandoned").length,
      averageResolutionTime: errors.reduce((sum, e) => sum + (e.resolutionTime || 0), 0) / errors.length,
      commonErrors: this.groupErrorsByType(errors),
    };

    return stats;
  }

  /**
   * Group errors by type for statistics
   */
  private groupErrorsByType(errors: ValidationError[]) {
    const grouped: Record<string, { count: number; examples: string[] }> = {};

    for (const error of errors) {
      if (!grouped[error.fieldType]) {
        grouped[error.fieldType] = { count: 0, examples: [] };
      }
      grouped[error.fieldType].count++;
      if (grouped[error.fieldType].examples.length < 3 && error.originalValue) {
        grouped[error.fieldType].examples.push(error.originalValue);
      }
    }

    return grouped;
  }

  /**
   * Track a validation error
   */
  private async trackValidationError(params: {
    userId: string;
    fieldName: string;
    fieldType: string;
    originalValue: string;
    errorType: string;
    context?: any;
  }) {
    await db.insert(validationErrors).values({
      ...params,
      frequency: 1,
      userResolution: "ignored",
    });
  }

  /**
   * Create or update a validation rule (admin only)
   */
  async createOrUpdateRule(ruleData: Partial<ValidationRule>) {
    if (ruleData.id) {
      // Update existing rule
      await db
        .update(validationRules)
        .set({
          ...ruleData,
          updatedAt: new Date(),
        })
        .where(eq(validationRules.id, ruleData.id));
      
      return ruleData;
    } else {
      // Create new rule
      const [newRule] = await db.insert(validationRules).values(ruleData).returning();
      return newRule;
    }
  }
}

export const validationService = new ValidationService();