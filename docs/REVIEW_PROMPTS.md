Based on the strategic analysis, here's an effective prompt template for performing directory reviews:

Directory Review Prompt Template
Context Section
"Please review the [DIRECTORY_PATH] directory in this [PROJECT_TYPE] application. 
The directory contains [BRIEF_DESCRIPTION_OF_CONTENTS] and is responsible for [PRIMARY_PURPOSE].
Key dependencies include: [LIST_MAIN_DEPENDENCIES]"

Scope & Focus Areas
"Focus your review on:
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
Exclude/deprioritize: [test files, generated files, etc.]"

Specific Review Checklist
"Please verify:
□ All data models are properly typed in shared/schema.ts
□ API routes validate inputs using Zod schemas
□ React components use proper hooks and state management
□ Dark mode support is implemented correctly
□ Accessibility attributes (data-testid) are present
□ Error handling is comprehensive
□ No hardcoded secrets or API keys
□ Storage operations use the defined interface"

Deliverables Format
"Provide findings in this format:
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
   - [Brief highlights]"

Example Complete Prompt
Here's how you might use this template for reviewing a specific directory:

"Please review the /server/routers directory in this full-stack JavaScript application. The directory contains Express route handlers and is responsible for all API endpoints. Key dependencies include Drizzle ORM, Zod validation, and the storage interface.

Focus on: API contract validation, proper use of the storage interface, error handling, authentication middleware usage, and TypeScript typing consistency.

Please verify that all routes validate inputs using Zod schemas, responses match the shared schema types, authentication is properly applied where needed, and error responses follow a consistent format.

Provide critical issues first, followed by improvements, using the format: Issue description, specific location, impact explanation, and concrete fix steps."

Pro Tips for Effective Reviews
Be Specific About Constraints: Mention your tech stack, coding guidelines, and any project-specific patterns
Request Actionable Feedback: Ask for concrete code examples or specific line changes
Set Priority Levels: Help reviewers focus on what matters most
Include Acceptance Criteria: Define what "good" looks like for your codebase
Scope Appropriately: Don't review too much at once - one logical module or feature area works best
This template ensures comprehensive, actionable feedback while keeping the review focused and manageable. Would you like me to help you customize this template for a specific directory in your project?