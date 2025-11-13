# Step 1: Audit JSON Columns

**Estimated Time:** 30 minutes  
**Difficulty:** Easy  
**Prerequisites:** Access to `shared/schema.ts`

## Overview

This step identifies all JSON/JSONB columns in your database schema that need TypeScript interfaces. You'll create a comprehensive inventory of every JSON field, documenting its purpose, structure, and current typing issues.

## Why This Matters

Before implementing TypeScript interfaces, you need a complete map of:
- Which tables have JSON columns
- What data each JSON column stores
- Which columns are causing TypeScript errors
- The relationships between JSON fields across tables

## Step-by-Step Instructions

### 1. Open and Review Schema File

**Prompt to execute:**
```
Read the file `shared/schema.ts` and identify all tables that use JSON or JSONB columns. For each table with JSON columns, list:
1. Table name
2. JSON column names
3. Whether the column uses .$type<...>() annotation
4. The current type (if any)
5. Whether the column is nullable or required
```

### 2. Identify JSON Columns by Feature Area

Organize the JSON columns by their feature area to understand the scope better.

**Prompt to execute:**
```
Group all identified JSON columns by feature area (e.g., Sentiment Analysis, Fraud Detection, Cohort Analysis, etc.). For each feature area, list:
- Feature name
- Tables involved
- JSON columns in those tables
- Brief description of what data each column stores
```

### 3. Document Complex Nested Structures

Some JSON columns contain deeply nested objects or arrays. These require special attention.

**Prompt to execute:**
```
Identify JSON columns that contain:
1. Arrays of objects
2. Nested objects (3+ levels deep)
3. Union types or discriminated unions
4. Record/Map structures with dynamic keys
5. Optional nested properties

Create a list of these complex columns with notes about their structure.
```

### 4. Find Existing Type Definitions

Check if any TypeScript interfaces or types already exist for these JSON structures.

**Prompt to execute:**
```
Search the codebase for existing TypeScript interfaces or type definitions that might already describe the JSON column structures. Look in:
- shared/schema.ts (inline types)
- Any @types files
- Type definitions near table declarations

List any existing types that could be reused or need to be refactored.
```

### 5. Create Audit Report

Generate a comprehensive audit document.

**Prompt to execute:**
```
Create a markdown table with the following columns:
- Feature Area
- Table Name
- Column Name
- Current Type Annotation
- Is Nullable
- Complexity (Simple/Medium/Complex)
- Notes

Include all JSON columns found in the previous steps. Save this as `json-columns-audit.md`.
```

### 6. Identify Priority Columns

Not all JSON columns need interfaces immediately. Prioritize based on:
- Columns causing TypeScript errors
- Frequently accessed columns
- Columns with complex nested structures

**Prompt to execute:**
```
Based on the audit report, categorize JSON columns into three priority levels:

**Priority 1 (High):** Columns currently causing TypeScript errors in server/storage.ts
**Priority 2 (Medium):** Columns with complex nested structures that would benefit from type safety
**Priority 3 (Low):** Simple JSON columns that work fine without explicit interfaces

Create a prioritized list and append it to `json-columns-audit.md`.
```

## Expected Output

By the end of this step, you should have:

1. ✅ Complete list of all JSON columns in your schema
2. ✅ Columns organized by feature area
3. ✅ Identification of complex nested structures
4. ✅ Documentation of existing type definitions
5. ✅ Comprehensive audit report (`json-columns-audit.md`)
6. ✅ Prioritized list of columns to implement

## Common Issues

### Issue: Too many JSON columns to handle at once
**Solution:** Focus on Priority 1 columns first. Implement interfaces for error-causing columns, then gradually work through Priority 2 and 3.

### Issue: Unclear what structure a JSON column should have
**Solution:** Check the storage.ts methods that use this column. Look at the actual insert/update operations to understand the expected data shape.

### Issue: Some columns have inconsistent data shapes
**Solution:** Document both shapes and plan to create union types or optional properties. You may need to discuss with the team about standardizing the data format.

## Verification Prompt

**Run this prompt to verify Step 1 is complete:**

```
Verify that the audit is complete by checking:

1. Does `json-columns-audit.md` exist and contain all JSON columns from shared/schema.ts?
2. Are all columns categorized by feature area?
3. Are complex nested structures identified and documented?
4. Is there a prioritized list with at least Priority 1 (high-priority) columns clearly marked?
5. Read through the audit report and confirm it's comprehensive and accurate.

If all checks pass, respond with:
✅ "Step 1 Complete: JSON columns audit finished. Found [X] JSON columns across [Y] tables. [Z] Priority 1 columns require immediate attention."

If any checks fail, specify what's missing and what needs to be added to complete the audit.
```

---

**Next Step:** Once verification passes, proceed to [Step 2: Define TypeScript Interfaces](02-define-interfaces.md)
