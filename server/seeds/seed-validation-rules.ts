import { db } from "./db";
import { validationRules } from "@shared/schema";

const seedValidationRules = async () => {
  console.log("Seeding validation rules...");

  const rules = [
    {
      fieldType: "phone",
      rules: {
        patterns: [
          { 
            regex: "^\\+?[1-9]\\d{1,14}$", 
            flags: "", 
            description: "International E.164 format" 
          },
          { 
            regex: "^(\\+?1[-.\\s]?)?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})$", 
            flags: "", 
            description: "US/Canada format" 
          }
        ],
        lengthConstraints: { min: 7, max: 15 },
        formatters: [
          { from: "^(\\d{3})(\\d{3})(\\d{4})$", to: "($1) $2-$3" },
          { from: "^(\\d{3})(\\d{4})$", to: "$1-$2" }
        ],
      },
      errorMessages: {
        default: "Please enter a valid phone number",
        tooShort: "Phone number is too short - missing area code?",
        tooLong: "Phone number is too long",
        invalidFormat: "Invalid phone number format",
      },
      suggestions: {
        formatHints: ["(555) 123-4567", "555-123-4567", "+1 555 123 4567"],
        commonMistakes: [
          { mistake: "5551234", correction: "Add area code: (212) 555-1234" },
          { mistake: "555.123.4567", correction: "Use dashes: 555-123-4567" }
        ],
        quickFixes: [
          { label: "Add US country code", action: "add_country_code" },
          { label: "Format as US number", action: "format_us" }
        ],
      },
      aiConfig: {
        useAI: true,
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        maxSuggestions: 3,
        contextFields: ["country", "state"],
      },
      priority: 100,
      isActive: true,
    },
    {
      fieldType: "email",
      rules: {
        patterns: [
          { 
            regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", 
            flags: "i", 
            description: "Standard email format" 
          }
        ],
        lengthConstraints: { min: 5, max: 254 },
        characterConstraints: { 
          forbidden: " ",
        },
      },
      errorMessages: {
        default: "Please enter a valid email address",
        invalidFormat: "Email format should be: user@domain.com",
        missing: "Email address is required",
      },
      suggestions: {
        formatHints: ["user@example.com", "name@company.org"],
        commonMistakes: [
          { mistake: "@gmail", correction: "user@gmail.com" },
          { mistake: "@yahoo", correction: "user@yahoo.com" },
          { mistake: "@hotmail", correction: "user@hotmail.com" }
        ],
        autoCorrect: [
          { pattern: "gmai\\.com$", replacement: "gmail.com" },
          { pattern: "yahooo\\.com$", replacement: "yahoo.com" },
          { pattern: "hotmial\\.com$", replacement: "hotmail.com" }
        ],
      },
      aiConfig: {
        useAI: true,
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        maxSuggestions: 3,
      },
      priority: 90,
      isActive: true,
    },
    {
      fieldType: "zipCode",
      rules: {
        patterns: [
          { 
            regex: "^\\d{5}(-\\d{4})?$", 
            flags: "", 
            description: "US ZIP code" 
          }
        ],
        lengthConstraints: { min: 5, max: 10 },
      },
      errorMessages: {
        default: "Please enter a valid ZIP code",
        tooShort: "ZIP code must be at least 5 digits",
        invalidFormat: "Format should be: 12345 or 12345-6789",
      },
      suggestions: {
        formatHints: ["12345", "12345-6789"],
        quickFixes: [
          { label: "Remove +4 extension", action: "remove_extension" },
          { label: "Add +4 extension", action: "add_extension" }
        ],
      },
      aiConfig: {
        useAI: true,
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        maxSuggestions: 2,
        contextFields: ["city", "state"],
      },
      priority: 80,
      isActive: true,
    },
    {
      fieldType: "creditCard",
      rules: {
        patterns: [
          { 
            regex: "^\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}$", 
            flags: "", 
            description: "Credit card number" 
          }
        ],
        lengthConstraints: { min: 13, max: 19 },
        validators: [
          { type: "luhn", params: {} }
        ],
      },
      errorMessages: {
        default: "Please enter a valid credit card number",
        invalidFormat: "Card number should be 16 digits",
      },
      suggestions: {
        formatHints: ["4111 1111 1111 1111", "5500-0000-0000-0004"],
        quickFixes: [
          { label: "Format with spaces", action: "format_spaces" },
          { label: "Format with dashes", action: "format_dashes" }
        ],
      },
      aiConfig: {
        useAI: false, // Don't use AI for sensitive data
      },
      priority: 70,
      isActive: true,
    },
    {
      fieldType: "date",
      rules: {
        patterns: [
          { 
            regex: "^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/(19|20)\\d{2}$", 
            flags: "", 
            description: "MM/DD/YYYY format" 
          },
          { 
            regex: "^(19|20)\\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$", 
            flags: "", 
            description: "YYYY-MM-DD format" 
          }
        ],
      },
      errorMessages: {
        default: "Please enter a valid date",
        invalidFormat: "Use format: MM/DD/YYYY or YYYY-MM-DD",
      },
      suggestions: {
        formatHints: ["01/15/2024", "2024-01-15"],
        quickFixes: [
          { label: "Use US format (MM/DD/YYYY)", action: "format_us" },
          { label: "Use ISO format (YYYY-MM-DD)", action: "format_iso" }
        ],
      },
      aiConfig: {
        useAI: true,
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        maxSuggestions: 2,
      },
      priority: 60,
      isActive: true,
    },
    {
      fieldType: "url",
      rules: {
        patterns: [
          { 
            regex: "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$", 
            flags: "i", 
            description: "URL with protocol" 
          }
        ],
      },
      errorMessages: {
        default: "Please enter a valid URL",
        invalidFormat: "URL should start with http:// or https://",
      },
      suggestions: {
        formatHints: ["https://example.com", "http://site.org/page"],
        autoCorrect: [
          { pattern: "^(?!https?:\\/\\/)", replacement: "https://" }
        ],
        quickFixes: [
          { label: "Add https://", action: "add_https" },
          { label: "Add http://", action: "add_http" }
        ],
      },
      aiConfig: {
        useAI: true,
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        maxSuggestions: 2,
      },
      priority: 50,
      isActive: true,
    },
    {
      fieldType: "ssn",
      rules: {
        patterns: [
          { 
            regex: "^\\d{3}-?\\d{2}-?\\d{4}$", 
            flags: "", 
            description: "US Social Security Number" 
          }
        ],
        lengthConstraints: { min: 9, max: 11 },
      },
      errorMessages: {
        default: "Please enter a valid SSN",
        invalidFormat: "Format should be: 123-45-6789",
      },
      suggestions: {
        formatHints: ["123-45-6789"],
        quickFixes: [
          { label: "Add dashes", action: "format_with_dashes" },
          { label: "Remove dashes", action: "remove_dashes" }
        ],
      },
      aiConfig: {
        useAI: false, // Don't use AI for sensitive data
      },
      priority: 40,
      isActive: true,
    }
  ];

  try {
    // Insert all validation rules
    for (const rule of rules) {
      await db.insert(validationRules).values(rule).onConflictDoNothing();
    }
    
    console.log(`✅ Seeded ${rules.length} validation rules`);
  } catch (error) {
    console.error("Error seeding validation rules:", error);
    throw error;
  }
};

// Run the seed function
seedValidationRules()
  .then(() => {
    console.log("Validation rules seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Validation rules seeding failed:", error);
    process.exit(1);
  });

export { seedValidationRules };