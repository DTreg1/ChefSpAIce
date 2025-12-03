# ChefSpAIce - Untested Features & Testing Prompts

This document lists all application features that do not have dedicated test coverage, along with detailed prompts you can use to test each feature.

---

## Admin & Analytics Features

### 1. A/B Testing Management (`ABTesting.tsx`)

**Test Prompt:**
```
Test the A/B Testing management page:
1. Navigate to the A/B Testing page
2. Verify the page loads without errors
3. Check that any existing experiments are displayed in a list/table format
4. Test creating a new experiment with:
   - Experiment name: "Button Color Test"
   - Variants: "Control" (blue) and "Treatment" (green)
   - Traffic allocation: 50/50 split
5. Verify the experiment appears in the list after creation
6. Test editing an existing experiment's settings
7. Test pausing/resuming an experiment
8. Test viewing experiment results/metrics
9. Test deleting an experiment (with confirmation dialog)
10. Verify proper error handling for invalid inputs
```

### 2. Admin Dashboard (`admin-dashboard.tsx`)

**Test Prompt:**
```
Test the Admin Dashboard:
1. Navigate to the admin dashboard (requires admin authentication)
2. Verify 401 response when accessing without admin role
3. When authenticated as admin, verify the dashboard loads
4. Check that key metrics are displayed:
   - Total users count
   - Active users (daily/weekly/monthly)
   - System health indicators
   - Recent activity feed
5. Verify navigation links to other admin sections work
6. Test any quick action buttons on the dashboard
7. Verify real-time data updates (if applicable)
8. Test responsiveness on mobile viewport
9. Check that non-admin users are redirected appropriately
```

### 3. Analytics Dashboard (`AnalyticsDashboard.tsx`)

**Test Prompt:**
```
Test the Analytics Dashboard:
1. Navigate to the Analytics Dashboard
2. Verify charts and graphs load properly
3. Test date range filters:
   - Last 7 days
   - Last 30 days
   - Custom date range
4. Verify data visualization components render:
   - Line charts for trends
   - Bar charts for comparisons
   - Pie charts for distributions
5. Test exporting analytics data (if available)
6. Verify tooltips on chart data points
7. Test filtering by different metrics/dimensions
8. Check loading states while data fetches
9. Verify empty states when no data available
10. Test chart responsiveness on different screen sizes
```

### 4. Cohort Analysis (`CohortAnalysis.tsx`)

**Test Prompt:**
```
Test the Cohort Analysis page:
1. Navigate to Cohort Analysis
2. Verify cohort table/matrix loads properly
3. Test creating a new cohort based on:
   - Sign-up date
   - First action date
   - User segment criteria
4. Verify retention metrics are calculated correctly
5. Test hovering over cells to see detailed metrics
6. Test exporting cohort data
7. Verify cohort comparison functionality
8. Test filtering cohorts by time period
9. Check color-coded retention visualization
10. Verify proper handling of cohorts with no data
```

### 5. Retention Dashboard (`RetentionDashboard.tsx`)

**Test Prompt:**
```
Test the Retention Dashboard:
1. Navigate to the Retention Dashboard
2. Verify retention curves are displayed
3. Test viewing retention by:
   - Day 1, Day 7, Day 30 retention rates
   - User acquisition source
   - User segment
4. Verify cohort-based retention tables
5. Test comparing retention across time periods
6. Check retention trend indicators (improving/declining)
7. Test drilling down into specific retention metrics
8. Verify automated retention campaign triggers display
9. Test exporting retention reports
10. Check mobile responsiveness
```

### 6. Fraud Dashboard (`fraud-dashboard.tsx`)

**Test Prompt:**
```
Test the Fraud Dashboard:
1. Navigate to the Fraud Dashboard (requires admin access)
2. Verify fraud alerts/flags are displayed
3. Check fraud risk scores for flagged users
4. Test reviewing individual fraud cases:
   - View user activity details
   - See risk indicators
   - Mark as legitimate or confirmed fraud
5. Test bulk actions on multiple flagged items
6. Verify fraud patterns/trends visualization
7. Test filtering by fraud type or severity
8. Check automated fraud detection rules display
9. Test adjusting fraud detection thresholds
10. Verify audit log of fraud review actions
```

### 7. Trends Dashboard (`trends-dashboard.tsx`)

**Test Prompt:**
```
Test the Trends Dashboard:
1. Navigate to the Trends Dashboard
2. Verify trend charts load properly
3. Test viewing trends for:
   - Popular ingredients
   - Recipe categories
   - User activity patterns
   - Search terms
4. Test date range selection for trend analysis
5. Verify trend comparison (this week vs last week)
6. Test hovering for detailed trend data
7. Check trending items list/highlights
8. Test filtering trends by category
9. Verify real-time trend updates
10. Test exporting trend data
```

### 8. System Health (`SystemHealth.tsx`)

**Test Prompt:**
```
Test the System Health page:
1. Navigate to System Health monitoring
2. Verify health status indicators:
   - Database connection status
   - API response times
   - Error rates
   - Memory/CPU usage (if displayed)
3. Test health check refresh functionality
4. Verify historical health data charts
5. Test alert thresholds configuration
6. Check status of external service integrations:
   - OpenAI API
   - USDA API
   - Stripe
   - Push notification services
7. Test viewing error logs/recent issues
8. Verify uptime percentage display
9. Test health check endpoint directly
10. Check mobile responsiveness of status indicators
```

---

## AI/ML Demo Pages

### 9. AI Assistant (`ai-assistant.tsx`)

**Test Prompt:**
```
Test the AI Assistant page:
1. Navigate to the AI Assistant
2. Verify the chat interface loads
3. Test sending a simple question: "What can you help me with?"
4. Verify streaming response displays properly
5. Test recipe-related queries: "Suggest a dinner with chicken"
6. Test cooking technique questions: "How do I properly sear a steak?"
7. Verify conversation history is maintained
8. Test clearing conversation history
9. Check error handling when API fails
10. Test response formatting (lists, bold text, etc.)
11. Verify loading indicators during response generation
12. Test on mobile viewport for usability
```

### 10. AI Features Showcase (`AIFeatures.tsx`)

**Test Prompt:**
```
Test the AI Features page:
1. Navigate to the AI Features showcase
2. Verify all AI feature cards/sections display
3. Check feature descriptions are accurate
4. Test any interactive demos on the page
5. Verify links to individual AI feature pages work
6. Test feature availability indicators
7. Check loading states for feature status checks
8. Verify proper layout and styling
9. Test mobile responsiveness
10. Check that disabled features show appropriate messaging
```

### 11. Face Detection Demo (`FaceDetectionDemo.tsx`)

**Test Prompt:**
```
Test the Face Detection Demo:
1. Navigate to the Face Detection Demo
2. Verify camera/upload interface loads
3. Test uploading an image with faces:
   - Single face detection
   - Multiple faces detection
4. Verify face bounding boxes are drawn correctly
5. Test with images containing no faces
6. Check detection confidence scores display
7. Test camera capture mode (if available)
8. Verify privacy controls/disclaimers are visible
9. Test with different image formats (JPEG, PNG)
10. Check error handling for unsupported files
11. Verify loading state during detection
12. Test on mobile devices with camera
```

### 12. Semantic Search Demo (`SemanticSearchDemo.tsx`)

**Test Prompt:**
```
Test the Semantic Search Demo:
1. Navigate to the Semantic Search Demo
2. Verify search input is available
3. Test semantic queries:
   - "Something healthy for breakfast"
   - "Quick weeknight dinners"
   - "Kid-friendly snacks"
4. Verify results show relevance/similarity scores
5. Compare semantic vs keyword search results
6. Test with empty query handling
7. Verify result cards display properly
8. Test clicking on search results
9. Check search history (if applicable)
10. Verify loading states during search
11. Test long query handling
12. Check mobile responsiveness
```

### 13. Summarization Demo (`summarization-demo.tsx` / `summarization.tsx`)

**Test Prompt:**
```
Test the Summarization features:
1. Navigate to the Summarization Demo page
2. Verify text input area loads
3. Test summarizing a long recipe:
   - Paste a lengthy recipe text
   - Click summarize
   - Verify summary is generated
4. Test different summary lengths:
   - Brief summary
   - Detailed summary
5. Test summarizing cooking instructions
6. Verify bullet point extraction
7. Test with very short text (edge case)
8. Check error handling for empty input
9. Verify loading state during summarization
10. Test copy-to-clipboard functionality
11. Check mobile responsiveness
```

### 14. Translation Demo (`TranslationDemo.tsx`)

**Test Prompt:**
```
Test the Translation Demo:
1. Navigate to the Translation Demo
2. Verify language selection dropdowns
3. Test translating a recipe from English to Spanish
4. Test translating cooking instructions
5. Verify translation accuracy (spot check)
6. Test auto-detect source language
7. Test multiple target languages:
   - French, German, Italian, Japanese
8. Check special characters handling
9. Test with empty input
10. Verify loading state during translation
11. Test copy translated text
12. Check swap languages functionality
```

### 15. Writing Assistant (`writing-assistant.tsx`)

**Test Prompt:**
```
Test the Writing Assistant:
1. Navigate to the Writing Assistant
2. Verify the text editor loads
3. Test writing improvement suggestions:
   - Paste text and request improvements
   - Verify suggestions are generated
4. Test grammar checking functionality
5. Test recipe description enhancement
6. Test generating recipe introductions
7. Verify tone adjustment options (if available)
8. Test with different content types
9. Check suggestion acceptance/rejection flow
10. Verify undo/redo functionality
11. Test character/word count display
12. Check mobile responsiveness
```

### 16. Recommendations Demo (`recommendations-demo.tsx` / `recommendations-public-demo.tsx`)

**Test Prompt:**
```
Test the Recommendations features:
1. Navigate to the Recommendations Demo
2. Verify recommendation cards load
3. Test "Based on your inventory" recommendations
4. Test "Similar recipes" recommendations
5. Test "Trending recipes" section
6. Verify recommendation explanations
7. Test filtering recommendations by:
   - Cuisine type
   - Cooking time
   - Difficulty level
8. Test clicking on recommendations
9. Verify refresh recommendations functionality
10. Check personalization indicators
11. Test the public demo version for non-authenticated users
12. Verify loading states
```

---

## Content Management

### 17. Alt-Text Management (`alt-text-management.tsx`)

**Test Prompt:**
```
Test Alt-Text Management:
1. Navigate to the Alt-Text Management page (admin)
2. Verify list of images needing alt-text
3. Test auto-generating alt-text for an image
4. Verify generated alt-text quality
5. Test manually editing alt-text
6. Test bulk alt-text generation
7. Check alt-text quality scores
8. Test filtering by quality score
9. Verify save/update functionality
10. Test preview of alt-text with image
11. Check accessibility compliance indicators
12. Test pagination of image list
```

### 18. Cooking Terms Admin (`cooking-terms-admin.tsx`)

**Test Prompt:**
```
Test Cooking Terms Administration:
1. Navigate to the Cooking Terms Admin page
2. Verify list of cooking terms displays
3. Test adding a new cooking term:
   - Term: "Julienne"
   - Definition: "To cut food into thin, uniform strips"
   - Category: "Cutting techniques"
4. Test editing an existing term
5. Test deleting a term (with confirmation)
6. Test searching/filtering terms
7. Verify term categories display
8. Test bulk import of terms
9. Check related terms linking
10. Verify term preview
11. Test export functionality
12. Check pagination
```

### 19. Excerpt Generator (`excerpt-generator.tsx`)

**Test Prompt:**
```
Test the Excerpt Generator:
1. Navigate to the Excerpt Generator
2. Verify input area for content
3. Test generating excerpt from a recipe description
4. Test different excerpt lengths:
   - Short (50 words)
   - Medium (100 words)
   - Long (200 words)
5. Verify excerpt maintains key information
6. Test with different content types
7. Check character limit enforcement
8. Test copy excerpt functionality
9. Verify loading state during generation
10. Test regenerate button
11. Check empty input handling
12. Verify mobile responsiveness
```

### 20. Content Moderation (`moderation.tsx` / `moderation-test.tsx`)

**Test Prompt:**
```
Test Content Moderation:
1. Navigate to the Moderation page (admin)
2. Verify moderation queue displays
3. Test reviewing flagged content:
   - Recipes with inappropriate content
   - User-generated descriptions
   - Chat messages
4. Test approve/reject actions
5. Verify moderation reasons are captured
6. Test bulk moderation actions
7. Check content preview functionality
8. Test filtering by content type
9. Verify moderation history/audit log
10. Test automated moderation rules
11. Check appeal handling workflow
12. Verify notification to users about moderation
```

### 21. Glossary (`glossary.tsx`)

**Test Prompt:**
```
Test the Glossary page:
1. Navigate to the Glossary
2. Verify alphabetical navigation works
3. Test searching for a term: "blanch"
4. Verify term definitions display properly
5. Test clicking on a term for full details
6. Check related terms suggestions
7. Test filtering by category
8. Verify pronunciation guides (if available)
9. Test print/export glossary
10. Check mobile responsiveness
11. Verify links to related recipes
12. Test with empty search results
```

### 22. Drafts (`Drafts.tsx`)

**Test Prompt:**
```
Test the Drafts page:
1. Navigate to the Drafts page
2. Verify list of saved drafts displays
3. Test creating a new draft recipe
4. Verify auto-save functionality
5. Test editing an existing draft
6. Test publishing a draft
7. Test deleting a draft (with confirmation)
8. Check draft timestamps
9. Test searching/filtering drafts
10. Verify draft preview mode
11. Test sorting drafts by date
12. Check empty state when no drafts
```

---

## Utility Pages

### 23. Data Extraction (`extraction.tsx`)

**Test Prompt:**
```
Test the Data Extraction page:
1. Navigate to the Extraction page
2. Verify upload interface for documents
3. Test extracting data from:
   - Recipe PDF
   - Recipe image
   - Recipe webpage URL
4. Verify extracted ingredients list
5. Check extracted instructions formatting
6. Test nutrition data extraction
7. Verify confidence scores for extractions
8. Test editing extracted data
9. Check saving extracted recipe
10. Verify error handling for unsupported formats
11. Test batch extraction
12. Check extraction progress indicator
```

### 24. OCR (`ocr.tsx`)

**Test Prompt:**
```
Test the OCR page:
1. Navigate to the OCR page
2. Verify image upload interface
3. Test OCR on a clear text image
4. Test OCR on a handwritten recipe (if supported)
5. Verify extracted text accuracy
6. Test language detection
7. Check text formatting preservation
8. Test with low-quality images
9. Verify copy extracted text
10. Test editing OCR results
11. Check processing progress indicator
12. Test on mobile with camera capture
```

### 25. Transcriptions (`transcriptions.tsx`)

**Test Prompt:**
```
Test the Transcriptions page:
1. Navigate to the Transcriptions page
2. Verify audio/video upload interface
3. Test transcribing an audio file
4. Verify transcript accuracy
5. Test timestamp display in transcript
6. Check speaker identification (if available)
7. Test editing transcripts
8. Verify download transcript options (TXT, SRT)
9. Test transcribing cooking video audio
10. Check progress indicator for long files
11. Test error handling for unsupported formats
12. Verify mobile responsiveness
```

### 26. Image Enhancement (`ImageEnhancement.tsx`)

**Test Prompt:**
```
Test the Image Enhancement page:
1. Navigate to Image Enhancement
2. Verify image upload interface
3. Test auto-enhance on a food photo
4. Test manual adjustments:
   - Brightness
   - Contrast
   - Saturation
   - Sharpness
5. Verify before/after comparison view
6. Test crop functionality
7. Check filter presets (if available)
8. Test download enhanced image
9. Verify undo/reset functionality
10. Test with different image sizes
11. Check loading state during processing
12. Test on mobile devices
```

### 27. Form Completion Demo (`form-completion-demo.tsx`)

**Test Prompt:**
```
Test the Form Completion Demo:
1. Navigate to the Form Completion Demo
2. Verify form fields display
3. Test auto-complete for ingredient names
4. Test address auto-complete (if applicable)
5. Verify smart suggestions based on context
6. Test form validation with auto-filled data
7. Check auto-fill from previous entries
8. Test clearing auto-completed fields
9. Verify keyboard navigation with suggestions
10. Test on mobile with touch interactions
11. Check loading states for suggestions
12. Verify error handling when API unavailable
```

### 28. Validation Demo (`validation-demo.tsx`)

**Test Prompt:**
```
Test the Validation Demo:
1. Navigate to the Validation Demo
2. Verify form with validation rules displays
3. Test real-time validation:
   - Required fields
   - Email format
   - Number ranges
   - Date validation
4. Test custom validation rules
5. Verify error message display
6. Test success state indicators
7. Check cross-field validation
8. Test async validation (e.g., unique username)
9. Verify form submission blocking on errors
10. Test clearing validation errors
11. Check accessibility of error messages
12. Test on mobile keyboard
```

### 29. Tag Demo (`TagDemo.tsx`)

**Test Prompt:**
```
Test the Tag Demo:
1. Navigate to the Tag Demo
2. Verify tag input component displays
3. Test adding tags by typing and pressing Enter
4. Test removing tags by clicking X
5. Verify tag suggestions as you type
6. Test maximum tags limit (if applicable)
7. Check duplicate tag prevention
8. Test tag categories/colors
9. Verify keyboard navigation through tags
10. Test clicking suggested tags
11. Check mobile touch interactions
12. Verify proper styling of tags
```

### 30. Query Builder (`QueryBuilder.tsx`)

**Test Prompt:**
```
Test the Query Builder:
1. Navigate to the Query Builder
2. Verify builder interface loads
3. Test adding filter conditions:
   - Field: "cuisine", Operator: "equals", Value: "Italian"
4. Test adding multiple conditions with AND/OR
5. Verify nested condition groups
6. Test removing conditions
7. Check query preview/output
8. Test running the built query
9. Verify results display
10. Test saving queries
11. Check loading saved queries
12. Verify mobile responsiveness
```

---

## Platform Features

### 31. Notifications (`notifications.tsx`)

**Test Prompt:**
```
Test the Notifications page:
1. Navigate to the Notifications page
2. Verify list of notifications displays
3. Test marking notification as read
4. Test marking all as read
5. Check notification categories:
   - Expiration alerts
   - Recipe suggestions
   - System updates
6. Test notification settings/preferences
7. Verify push notification opt-in/out
8. Test notification filtering
9. Check notification timestamps
10. Test clearing old notifications
11. Verify empty state
12. Test mobile responsiveness
```

### 32. Scheduling (`Scheduling.tsx`)

**Test Prompt:**
```
Test the Scheduling page:
1. Navigate to the Scheduling page
2. Verify calendar/schedule view loads
3. Test scheduling a meal:
   - Select date and time
   - Choose recipe
   - Add notes
4. Test editing a scheduled item
5. Test deleting a scheduled item
6. Verify drag-and-drop rescheduling
7. Test recurring schedules
8. Check conflict detection
9. Test calendar view options (day/week/month)
10. Verify notifications for scheduled items
11. Test export to external calendar
12. Check mobile responsiveness
```

### 33. Sentiment Dashboard (`sentiment-dashboard.tsx`)

**Test Prompt:**
```
Test the Sentiment Dashboard:
1. Navigate to the Sentiment Dashboard
2. Verify sentiment overview loads
3. Check overall sentiment score
4. Test viewing sentiment by:
   - Time period
   - Content category
   - User segment
5. Verify sentiment trend charts
6. Test drilling into specific feedback
7. Check positive/negative highlight cards
8. Test sentiment keyword analysis
9. Verify export functionality
10. Check sentiment comparison features
11. Test date range filtering
12. Verify mobile responsiveness
```

### 34. Smart Search (`smart-search.tsx`)

**Test Prompt:**
```
Test the Smart Search page:
1. Navigate to Smart Search
2. Verify search interface loads
3. Test natural language queries:
   - "Find me something quick for dinner"
   - "Recipes with chicken and rice"
   - "Low carb breakfast ideas"
4. Verify search result relevance
5. Test filter refinement
6. Check search suggestions/autocomplete
7. Verify result card display
8. Test clicking through to recipes
9. Check search history
10. Test voice search (if available)
11. Verify no results state
12. Test mobile responsiveness
```

### 35. Ticket Routing (`ticket-routing.tsx`)

**Test Prompt:**
```
Test the Ticket Routing page (admin):
1. Navigate to Ticket Routing
2. Verify support ticket queue displays
3. Test automatic ticket categorization
4. Check priority assignment
5. Test assigning ticket to agent
6. Verify ticket status updates
7. Test routing rules configuration
8. Check ticket history/audit trail
9. Test bulk ticket actions
10. Verify SLA indicators
11. Test ticket search/filtering
12. Check mobile responsiveness
```

### 36. Feedback Analytics (`feedback-analytics.tsx`)

**Test Prompt:**
```
Test the Feedback Analytics page:
1. Navigate to Feedback Analytics
2. Verify feedback summary displays
3. Check feedback volume over time
4. Test filtering by feedback type:
   - Bug reports
   - Feature requests
   - General feedback
5. Verify rating distribution charts
6. Test viewing individual feedback items
7. Check common themes/topics
8. Test export feedback data
9. Verify response rate metrics
10. Test date range filtering
11. Check mobile responsiveness
12. Verify comparison with previous periods
```

### 37. Feedback Board (`feedback-board.tsx`)

**Test Prompt:**
```
Test the Feedback Board:
1. Navigate to the Feedback Board
2. Verify public feedback list displays
3. Test submitting new feedback
4. Verify upvoting/downvoting feedback
5. Test commenting on feedback
6. Check feedback status indicators
7. Test filtering by category
8. Verify sorting options
9. Test searching feedback
10. Check user's own feedback highlight
11. Verify admin response display
12. Test mobile responsiveness
```

---

## Other Pages

### 38. About Page (`about.tsx`)

**Test Prompt:**
```
Test the About page:
1. Navigate to the About page
2. Verify page content loads
3. Check company/product information
4. Verify team section (if applicable)
5. Test any external links
6. Check image loading
7. Verify contact information
8. Test navigation to other pages
9. Check social media links
10. Verify responsive layout
11. Test accessibility (screen reader)
12. Check meta tags for SEO
```

### 39. Camera Test (`camera-test.tsx`)

**Test Prompt:**
```
Test the Camera Test page:
1. Navigate to the Camera Test page
2. Verify camera permission prompt appears
3. Test granting camera access
4. Verify camera feed displays
5. Test capturing a photo
6. Verify captured image preview
7. Test switching cameras (front/back)
8. Check flash toggle (if available)
9. Test with camera permission denied
10. Verify error handling messages
11. Test on mobile devices
12. Check loading states
```

### 40. Equipment (`equipment.tsx`)

**Test Prompt:**
```
Test the Equipment page:
1. Navigate to the Equipment page
2. Verify equipment list displays
3. Test adding new equipment:
   - Name: "Stand Mixer"
   - Brand: "KitchenAid"
   - Category: "Mixing"
4. Test editing equipment details
5. Test deleting equipment
6. Verify equipment categories
7. Test searching/filtering equipment
8. Check equipment image upload
9. Test warranty/purchase date tracking
10. Verify maintenance reminders
11. Test equipment recommendations
12. Check mobile responsiveness
```

### 41. Onboarding (`onboarding.tsx`)

**Test Prompt:**
```
Test the Onboarding flow:
1. Access the onboarding as a new user
2. Verify welcome screen displays
3. Test step 1: Profile setup
   - Name, dietary preferences
4. Test step 2: Kitchen setup
   - Add common appliances
5. Test step 3: Initial inventory
   - Add a few food items
6. Test step 4: Preferences
   - Notification settings
   - Cuisine preferences
7. Verify progress indicators
8. Test skipping optional steps
9. Test going back to previous steps
10. Verify completion redirect
11. Check onboarding for returning users (should skip)
12. Test mobile responsiveness
```

### 42. Orders (`orders.tsx`)

**Test Prompt:**
```
Test the Orders page:
1. Navigate to the Orders page
2. Verify order history displays
3. Test viewing order details
4. Check order status indicators
5. Verify order items list
6. Test filtering by order status
7. Check date range filtering
8. Test searching orders
9. Verify payment information display
10. Test reorder functionality
11. Check order tracking (if applicable)
12. Test mobile responsiveness
```

### 43. Pricing Page (`pricing.tsx`)

**Test Prompt:**
```
Test the Pricing page:
1. Navigate to the Pricing page
2. Verify pricing tiers display
3. Check feature comparison table
4. Test monthly/annual toggle
5. Verify current plan indicator (if logged in)
6. Test "Get Started" / upgrade buttons
7. Check FAQ section
8. Verify pricing values display correctly
9. Test responsive layout
10. Check enterprise contact option
11. Verify accessibility
12. Test links to terms/features
```

### 44. Privacy Policy (`privacy.tsx`)

**Test Prompt:**
```
Test the Privacy Policy page:
1. Navigate to the Privacy Policy page
2. Verify content loads completely
3. Check table of contents navigation
4. Test internal anchor links
5. Verify last updated date displays
6. Check contact information
7. Test print functionality
8. Verify mobile readability
9. Check links to related pages
10. Test accessibility (screen reader)
11. Verify proper heading hierarchy
12. Check loading performance
```

### 45. Terms of Service (`terms.tsx`)

**Test Prompt:**
```
Test the Terms of Service page:
1. Navigate to the Terms page
2. Verify content loads completely
3. Check table of contents navigation
4. Test internal anchor links
5. Verify last updated date displays
6. Check contact information
7. Test print functionality
8. Verify mobile readability
9. Check links to related pages
10. Test accessibility (screen reader)
11. Verify proper heading hierarchy
12. Check loading performance
```

---

## Backend Routers Without Direct Tests

### 46. Autocomplete Router (`autocomplete.router.ts`)

**Test Prompt:**
```
Test the Autocomplete API:
1. Test GET /api/v1/autocomplete/ingredients?q=ch
   - Verify returns ingredient suggestions starting with "ch"
2. Test with empty query - verify proper response
3. Test with special characters
4. Test response time under 200ms
5. Verify result limit parameter works
6. Test case-insensitive matching
7. Check partial word matching
8. Verify result ranking/ordering
9. Test with authenticated vs unauthenticated user
10. Check rate limiting
```

### 47. Autosave Router (`autosave.router.ts`)

**Test Prompt:**
```
Test the Autosave API:
1. Test POST /api/v1/autosave with draft data
2. Verify draft is saved with timestamp
3. Test retrieving saved draft
4. Test updating existing draft
5. Verify draft expiration handling
6. Test multiple drafts per user
7. Check authentication requirement
8. Test draft size limits
9. Verify conflict resolution
10. Test cleanup of old drafts
```

### 48. Cooking Terms Router (`cooking-terms.router.ts`)

**Test Prompt:**
```
Test the Cooking Terms API:
1. Test GET /api/v1/cooking-terms - list all terms
2. Test GET /api/v1/cooking-terms?search=sear
3. Test GET /api/v1/cooking-terms/:id - single term
4. Test POST /api/v1/cooking-terms (admin)
5. Test PUT /api/v1/cooking-terms/:id (admin)
6. Test DELETE /api/v1/cooking-terms/:id (admin)
7. Verify admin authentication required for mutations
8. Check pagination parameters
9. Test category filtering
10. Verify proper error responses
```

### 49. Push Tokens Router (`push-tokens.router.ts`)

**Test Prompt:**
```
Test the Push Tokens API:
1. Test POST /api/v1/push-tokens - register token
   - Verify token is stored
2. Test with different device types (web, ios, android)
3. Test updating existing token
4. Test DELETE /api/v1/push-tokens - unregister
5. Verify authentication required
6. Test duplicate token handling
7. Check token validation
8. Test retrieving user's tokens
9. Verify token expiration handling
10. Test error responses for invalid tokens
```

### 50. Intelligent Notifications Router (`intelligent-notifications.router.ts`)

**Test Prompt:**
```
Test the Intelligent Notifications API:
1. Test GET /api/v1/intelligent-notifications/preferences
2. Test PUT preferences update
3. Verify notification timing optimization
4. Test notification grouping/batching
5. Check personalization factors
6. Test notification priority settings
7. Verify quiet hours configuration
8. Test channel preferences (push, email, in-app)
9. Check ML-based timing predictions
10. Verify authentication required
```

### 51. ML Router (`ml.router.ts`)

**Test Prompt:**
```
Test the ML API endpoints:
1. Test POST /api/v1/ml/predict - prediction endpoint
2. Test GET /api/v1/ml/models - available models
3. Verify model versioning
4. Test batch predictions
5. Check prediction confidence scores
6. Test with different model types
7. Verify feature input validation
8. Check rate limiting for ML endpoints
9. Test error handling for invalid inputs
10. Verify admin endpoints for model management
```

### 52. Recommendations Router (`recommendations.router.ts`)

**Test Prompt:**
```
Test the Recommendations API:
1. Test GET /api/v1/recommendations - personalized recommendations
2. Test GET /api/v1/recommendations/trending
3. Test GET /api/v1/recommendations/similar/:recipeId
4. Verify personalization based on user history
5. Test recommendation explanations
6. Check filtering parameters
7. Test pagination
8. Verify cold-start handling (new users)
9. Test recommendation refresh
10. Check authentication requirements
```

### 53. Ticket Routing Router (`ticket-routing.router.ts`)

**Test Prompt:**
```
Test the Ticket Routing API (admin):
1. Test POST /api/v1/admin/tickets - create ticket
2. Test GET /api/v1/admin/tickets - list tickets
3. Test PUT /api/v1/admin/tickets/:id/assign
4. Test automatic routing rules
5. Verify priority calculation
6. Test SLA assignment
7. Check agent workload balancing
8. Test ticket status transitions
9. Verify audit logging
10. Check admin authentication requirement
```

---

## Summary

| Category | Items | Priority |
|----------|-------|----------|
| Admin & Analytics | 8 features | High (admin functionality) |
| AI/ML Demos | 8 features | Medium (demo pages) |
| Content Management | 6 features | Medium |
| Utility Pages | 8 features | Medium |
| Platform Features | 7 features | High (core platform) |
| Other Pages | 8 features | Low-Medium |
| Backend Routers | 8 endpoints | High (API coverage) |

**Total Untested Features: 53**

### Recommended Testing Priority

1. **High Priority (Test First)**
   - Authentication-protected admin features
   - Core platform features (notifications, scheduling)
   - Backend API endpoints

2. **Medium Priority**
   - Content management tools
   - Utility pages users interact with
   - AI/ML demo pages

3. **Lower Priority**
   - Static pages (about, privacy, terms)
   - Demo/showcase pages
   - Edge case features
