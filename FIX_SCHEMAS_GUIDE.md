# Schema Fix Instructions - Step-by-Step Guide

## Overview
This guide provides step-by-step commands to fix 39 broken Insert schemas across 11 files. Each schema is missing a table parameter in its `createInsertSchema()` call.

---

## Step 1: Identify All Broken Schemas

Run this command to identify and log all broken schemas:

```bash
cd /home/runner/workspace/shared/schema

# Create output file with all broken schemas
cat > broken_schemas.txt << 'EOF'
BROKEN SCHEMAS REPORT
Generated: $(date)

EOF

# Find all files with createInsertSchema()
for file in content.ts experiments.ts extraction.ts forms.ts images.ts pricing.ts scheduling.ts security.ts sentiment.ts support.ts transcription.ts; do
  echo "=== $file ===" >> broken_schemas.txt
  grep -n "createInsertSchema()" "$file" >> broken_schemas.txt 2>/dev/null || echo "No broken schemas" >> broken_schemas.txt
  echo "" >> broken_schemas.txt
done

# Display the report
cat broken_schemas.txt
```

**Expected output:** List of all files and line numbers with `createInsertSchema()`

---

## Step 2: Fix forms.ts (Has Special Syntax Errors)

This file has orphaned fragments that need special cleanup.

### Fix 1: Clean up insertUserFormHistorySchema (Lines 478-481)

```bash
cd /home/runner/workspace/shared/schema

# View the current broken state
sed -n '478,481p' forms.ts
```

**You should see:**
```typescript
export const insertUserFormHistorySchema = createInsertSchema()
  
    lastUpdated: true,
  });
```

**Fix it:**
```bash
# Replace lines 478-481 with the fixed version
sed -i '478,481c\
export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);' forms.ts

# Verify the fix
sed -n '478p' forms.ts
```

**Expected output:** `export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);`

### Fix 2: Add table parameter to insertCompletionFeedbackSchema

```bash
# Find the line number
grep -n "export const insertCompletionFeedbackSchema = createInsertSchema()" forms.ts

# Fix it (should be around line 487)
sed -i 's/export const insertCompletionFeedbackSchema = createInsertSchema()/export const insertCompletionFeedbackSchema = createInsertSchema(completionFeedback)/' forms.ts

# Verify
grep "insertCompletionFeedbackSchema" forms.ts
```

### Fix 3: Add table parameter to insertValidationRuleSchema

```bash
# Fix it
sed -i 's/export const insertValidationRuleSchema = createInsertSchema()/export const insertValidationRuleSchema = createInsertSchema(validationRules)/' forms.ts

# Verify
grep "insertValidationRuleSchema" forms.ts
```

### Fix 4: Add table parameter to insertValidationErrorSchema

```bash
# Fix it
sed -i 's/export const insertValidationErrorSchema = createInsertSchema()/export const insertValidationErrorSchema = createInsertSchema(validationErrors)/' forms.ts

# Verify
grep "insertValidationErrorSchema" forms.ts
```

---

## Step 3: Fix content.ts (6 schemas)

```bash
cd /home/runner/workspace/shared/schema

# Fix all 6 schemas in one go
sed -i 's/export const insertCategorySchema = createInsertSchema()/export const insertCategorySchema = createInsertSchema(categories)/' content.ts
sed -i 's/export const insertContentCategorySchema = createInsertSchema()/export const insertContentCategorySchema = createInsertSchema(contentCategories)/' content.ts
sed -i 's/export const insertTagSchema = createInsertSchema()/export const insertTagSchema = createInsertSchema(tags)/' content.ts
sed -i 's/export const insertContentTagSchema = createInsertSchema()/export const insertContentTagSchema = createInsertSchema(contentTags)/' content.ts
sed -i 's/export const insertContentEmbeddingSchema = createInsertSchema()/export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings)/' content.ts
sed -i 's/export const insertRelatedContentCacheSchema = createInsertSchema()/export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache)/' content.ts

# Verify all fixes
grep "createInsertSchema()" content.ts
```

**Expected output:** No matches (all should now have table parameters)

---

## Step 4: Fix experiments.ts (5 schemas)

```bash
sed -i 's/export const insertExperimentSchema = createInsertSchema()/export const insertExperimentSchema = createInsertSchema(experiments)/' experiments.ts
sed -i 's/export const insertExperimentVariantSchema = createInsertSchema()/export const insertExperimentVariantSchema = createInsertSchema(experimentVariants)/' experiments.ts
sed -i 's/export const insertUserVariantSchema = createInsertSchema()/export const insertUserVariantSchema = createInsertSchema(userVariants)/' experiments.ts
sed -i 's/export const insertVariantMetricSchema = createInsertSchema()/export const insertVariantMetricSchema = createInsertSchema(variantMetrics)/' experiments.ts
sed -i 's/export const insertCohortSchema = createInsertSchema()/export const insertCohortSchema = createInsertSchema(cohorts)/' experiments.ts

# Verify
grep "createInsertSchema()" experiments.ts
```

**Expected output:** No matches

---

## Step 5: Fix extraction.ts (2 schemas)

```bash
sed -i 's/export const insertExtractionPatternSchema = createInsertSchema()/export const insertExtractionPatternSchema = createInsertSchema(extractionPatterns)/' extraction.ts
sed -i 's/export const insertExtractedContentSchema = createInsertSchema()/export const insertExtractedContentSchema = createInsertSchema(extractedContents)/' extraction.ts

# Verify
grep "createInsertSchema()" extraction.ts
```

**Expected output:** No matches

---

## Step 6: Fix images.ts (7 schemas)

```bash
sed -i 's/export const insertImagePresetSchema = createInsertSchema()/export const insertImagePresetSchema = createInsertSchema(imagePresets)/' images.ts
sed -i 's/export const insertUserImageSchema = createInsertSchema()/export const insertUserImageSchema = createInsertSchema(userImages)/' images.ts
sed -i 's/export const insertImageGenerationSchema = createInsertSchema()/export const insertImageGenerationSchema = createInsertSchema(imageGenerations)/' images.ts
sed -i 's/export const insertFaceDetectionSchema = createInsertSchema()/export const insertFaceDetectionSchema = createInsertSchema(faceDetections)/' images.ts
sed -i 's/export const insertImageAnalysisSchema = createInsertSchema()/export const insertImageAnalysisSchema = createInsertSchema(imageAnalyses)/' images.ts
sed -i 's/export const insertImageCollectionSchema = createInsertSchema()/export const insertImageCollectionSchema = createInsertSchema(imageCollections)/' images.ts
sed -i 's/export const insertCollectionImageSchema = createInsertSchema()/export const insertCollectionImageSchema = createInsertSchema(collectionImages)/' images.ts

# Verify
grep "createInsertSchema()" images.ts
```

**Expected output:** No matches

---

## Step 7: Fix pricing.ts (2 schemas)

```bash
sed -i 's/export const insertPricingRuleSchema = createInsertSchema()/export const insertPricingRuleSchema = createInsertSchema(pricingRules)/' pricing.ts
sed -i 's/export const insertUserPricingSchema = createInsertSchema()/export const insertUserPricingSchema = createInsertSchema(userPricing)/' pricing.ts

# Verify
grep "createInsertSchema()" pricing.ts
```

**Expected output:** No matches

---

## Step 8: Fix scheduling.ts (3 schemas)

```bash
sed -i 's/export const insertScheduledActionSchema = createInsertSchema()/export const insertScheduledActionSchema = createInsertSchema(scheduledActions)/' scheduling.ts
sed -i 's/export const insertRecurrenceRuleSchema = createInsertSchema()/export const insertRecurrenceRuleSchema = createInsertSchema(recurrenceRules)/' scheduling.ts
sed -i 's/export const insertScheduleExecutionSchema = createInsertSchema()/export const insertScheduleExecutionSchema = createInsertSchema(scheduleExecutions)/' scheduling.ts

# Verify
grep "createInsertSchema()" scheduling.ts
```

**Expected output:** No matches

---

## Step 9: Fix security.ts (3 schemas)

```bash
sed -i 's/export const insertSecurityEventSchema = createInsertSchema()/export const insertSecurityEventSchema = createInsertSchema(securityEvents)/' security.ts
sed -i 's/export const insertLoginAttemptSchema = createInsertSchema()/export const insertLoginAttemptSchema = createInsertSchema(loginAttempts)/' security.ts
sed -i 's/export const insertAccountLockSchema = createInsertSchema()/export const insertAccountLockSchema = createInsertSchema(accountLocks)/' security.ts

# Verify
grep "createInsertSchema()" security.ts
```

**Expected output:** No matches

---

## Step 10: Fix sentiment.ts (4 schemas)

```bash
sed -i 's/export const insertSentimentAnalysisSchema = createInsertSchema()/export const insertSentimentAnalysisSchema = createInsertSchema(sentimentAnalyses)/' sentiment.ts
sed -i 's/export const insertReadabilityScoreSchema = createInsertSchema()/export const insertReadabilityScoreSchema = createInsertSchema(readabilityScores)/' sentiment.ts
sed -i 's/export const insertKeywordExtractionSchema = createInsertSchema()/export const insertKeywordExtractionSchema = createInsertSchema(keywordExtractions)/' sentiment.ts
sed -i 's/export const insertTextSummarySchema = createInsertSchema()/export const insertTextSummarySchema = createInsertSchema(textSummaries)/' sentiment.ts

# Verify
grep "createInsertSchema()" sentiment.ts
```

**Expected output:** No matches

---

## Step 11: Fix support.ts (2 schemas)

```bash
sed -i 's/export const insertSupportTicketSchema = createInsertSchema()/export const insertSupportTicketSchema = createInsertSchema(supportTickets)/' support.ts
sed -i 's/export const insertTicketMessageSchema = createInsertSchema()/export const insertTicketMessageSchema = createInsertSchema(ticketMessages)/' support.ts

# Verify
grep "createInsertSchema()" support.ts
```

**Expected output:** No matches

---

## Step 12: Fix transcription.ts (2 schemas)

```bash
sed -i 's/export const insertTranscriptionSchema = createInsertSchema()/export const insertTranscriptionSchema = createInsertSchema(transcriptions)/' transcription.ts
sed -i 's/export const insertTranscriptionSegmentSchema = createInsertSchema()/export const insertTranscriptionSegmentSchema = createInsertSchema(transcriptionSegments)/' transcription.ts

# Verify
grep "createInsertSchema()" transcription.ts
```

**Expected output:** No matches

---

## Step 13: Final Verification

Check all files to ensure no broken schemas remain:

```bash
cd /home/runner/workspace/shared/schema

# This should return nothing (no broken schemas)
for file in content.ts experiments.ts extraction.ts forms.ts images.ts pricing.ts scheduling.ts security.ts sentiment.ts support.ts transcription.ts; do
  if grep -q "createInsertSchema()" "$file"; then
    echo "❌ STILL BROKEN: $file"
    grep -n "createInsertSchema()" "$file"
  else
    echo "✅ FIXED: $file"
  fi
done
```

**Expected output:** All files should show "✅ FIXED"

---

## Step 14: Test TypeScript Compilation

```bash
cd /home/runner/workspace

# Restart the application to test compilation
npm run dev
```

**Expected result:** Application should start without TypeScript errors

---

## Step 15: Clean Up

Remove the temporary tracking file:

```bash
cd /home/runner/workspace/shared/schema
rm -f broken_schemas.txt
```

---

## Quick Re-run Command

If you need to re-identify broken schemas at any point:

```bash
cd /home/runner/workspace/shared/schema && \
for file in *.ts; do \
  count=$(grep -c "createInsertSchema()" "$file" 2>/dev/null || echo "0"); \
  [ "$count" -gt "0" ] && echo "$file: $count broken schemas"; \
done
```

---

## Summary

**Total fixes:** 39 Insert schemas across 11 files  
**Estimated time:** 5-10 minutes  
**Risk:** Low - simple parameter additions  

After completing all steps, the application should compile successfully and return to zero-error state.
