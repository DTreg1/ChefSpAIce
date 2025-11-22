# Directory Review Prompt Templates

This document provides effective prompt templates for conducting thorough code reviews of specific directories.

## Directory Review Prompt Template

### 1. Context Section

```
Please review the [DIRECTORY_PATH] directory in this [PROJECT_TYPE] application. 
The directory contains [BRIEF_DESCRIPTION_OF_CONTENTS] and is responsible for [PRIMARY_PURPOSE].
Key dependencies include: [LIST_MAIN_DEPENDENCIES]
```

### 2. Scope & Focus Areas

```
Focus your review on:

1. **Functional Correctness**: Does the code achieve its intended purpose?
2. **Architecture & Patterns**: Are design patterns consistently applied?
3. **Data Modeling**: Is the schema properly defined and typed?
4. **Cross-cutting Concerns**: 
   - API contracts and validation
   - Shared schema alignment
   - State management (React Query usage)
   - Storage interface compliance
5. **Security**: API key handling, authentication, input validation

Prioritize files matching: [*.ts, *.tsx, etc.]
Exclude/deprioritize: [test files, generated files, etc.]
```

### 3. Specific Review Checklist

```
Please verify:

□ All data models are properly typed in shared/schema.ts
□ API routes validate inputs using Zod schemas
□ React components use proper hooks and state management
□ Dark mode support is implemented correctly
□ Accessibility attributes (data-testid) are present
□ Error handling is comprehensive
□ No hardcoded secrets or API keys
□ Storage operations use the defined interface
```

### 4. Deliverables Format

```
Provide findings in this format:

1. **Critical Issues** (blockers that must be fixed)
   - Issue: [description]
   - File/Line: [location]
   - Impact: [why this matters]
   - Fix: [specific remediation steps]

2. **High Priority** (should be addressed soon)
   - [Same format as above]

3. **Suggestions** (improvements for maintainability)
   - [Same format as above]

4. **Positive Patterns** (what's working well)
   - [Brief highlights]
```

## Example Complete Prompt

Here's how you might use this template for reviewing a specific directory:

```
Please review the `/server/routers` directory in this full-stack JavaScript application. 
The directory contains Express route handlers and is responsible for all API endpoints. 
Key dependencies include Drizzle ORM, Zod validation, and the storage interface.

Focus on: API contract validation, proper use of the storage interface, error handling, 
authentication middleware usage, and TypeScript typing consistency.

Please verify that all routes validate inputs using Zod schemas, responses match the 
shared schema types, authentication is properly applied where needed, and error responses 
follow a consistent format.

Provide critical issues first, followed by improvements, using the format: 
Issue description, specific location, impact explanation, and concrete fix steps.
```

## Pro Tips for Effective Reviews

1. **Be Specific About Constraints**: Mention your tech stack, coding guidelines, and any project-specific patterns
2. **Request Actionable Feedback**: Ask for concrete code examples or specific line changes
3. **Set Priority Levels**: Help reviewers focus on what matters most
4. **Include Acceptance Criteria**: Define what "good" looks like for your codebase
5. **Scope Appropriately**: Don't review too much at once - one logical module or feature area works best

## Quick Templates by Directory Type

### Frontend Components Review
```
Review `/client/src/components` focusing on:
- Component composition and reusability
- Props validation and TypeScript typing
- Accessibility (ARIA labels, keyboard navigation)
- Dark mode implementation
- Performance (memoization, lazy loading)
```

### API Routes Review
```
Review `/server/routes` focusing on:
- Input validation with Zod schemas
- Authentication/authorization middleware
- Error handling and response consistency
- Database transaction management
- Rate limiting and security headers
```

### Shared Schema Review
```
Review `/shared/schema.ts` focusing on:
- Type definitions completeness
- Zod validation schemas alignment
- Insert vs Select type consistency
- Field naming conventions
- Documentation of complex types
```

### Storage Layer Review
```
Review `/server/storage` focusing on:
- Interface implementation completeness
- Transaction handling
- Error propagation
- Query optimization
- Data integrity constraints
```

---

This template ensures comprehensive, actionable feedback while keeping reviews focused and manageable. Customize the template based on your specific needs and project requirements.