# ML Feature Implementation Prompts

## How to Use This Document

Each prompt below is self-contained and can be used independently. Simply copy the prompt for the feature you want to implement and use it to build that specific capability. The prompts are organized by category and include all necessary details for implementation.

Each prompt contains:
- **Purpose**: What the feature does
- **Tech Stack**: Which ML services/libraries to use
- **Database Schema**: Required data model changes
- **API Routes**: Backend endpoints needed
- **UI Components**: Frontend interface requirements
- **Success Criteria**: How to verify it's working

---

## 🔍 Smart Search & Discovery

### 1. Semantic Smart Search

**Prompt:**
"Implement semantic search using OpenAI embeddings that allows users to search for content by meaning rather than exact keyword matches. The search should understand context and find related results even when different words are used.

**Tech Stack**: OpenAI Embeddings API (text-embedding-ada-002)

**Database Schema**: Add to shared/schema.ts:
- embeddings table: id, content_id, content_type, embedding (vector/jsonb), metadata, created_at
- search_logs table: id, query, user_id, results_count, clicked_result_id, timestamp

**API Routes**: 
- POST /api/embeddings/generate - Generate embeddings for new content
- POST /api/search/semantic - Perform semantic search with query
- POST /api/search/feedback - Track which results users click

**UI Components**:
- SearchBar component with debounced input
- SearchResults component showing relevance scores
- SearchHighlight component to show matching context

**Success Criteria**: Search for 'how to login' finds results containing 'authentication', 'sign in', 'access account' etc."

### 2. Auto-Categorization

**Prompt:**
"Build an auto-categorization system that automatically classifies user-generated content into predefined categories using OpenAI's GPT API for zero-shot classification.

**Tech Stack**: OpenAI GPT-3.5-turbo API

**Database Schema**: Add to shared/schema.ts:
- categories table: id, name, description, parent_id, keywords
- content_categories table: content_id, category_id, confidence_score, is_manual

**API Routes**:
- GET /api/categories - List all available categories
- POST /api/categorize - Auto-categorize content
- PUT /api/categorize/:id - Manual override of category
- GET /api/analytics/categories - Category distribution stats

**UI Components**:
- CategoryBadge component showing assigned categories
- CategorySelector for manual override
- CategoryConfidence indicator (low/medium/high)
- CategoryManager admin panel

**Success Criteria**: Automatically categorize a blog post about 'React hooks' into 'Technology > Web Development > React' with >80% confidence."

### 3. Auto-Tagging

**Prompt:**
"Create an auto-tagging feature that analyzes content and automatically generates relevant tags using NLP to identify key topics, entities, and themes.

**Tech Stack**: OpenAI GPT-3.5-turbo + TensorFlow.js for keyword extraction

**Database Schema**: Add to shared/schema.ts:
- tags table: id, name, slug, usage_count, created_at
- content_tags table: content_id, tag_id, relevance_score, is_manual

**API Routes**:
- POST /api/tags/generate - Generate tags for content
- GET /api/tags/trending - Get trending tags
- POST /api/tags/approve - Approve/reject suggested tags
- GET /api/tags/related/:tag - Find related tags

**UI Components**:
- TagInput with auto-complete
- TagCloud showing popular tags
- TagSuggestions panel with approve/reject buttons
- TagEditor for managing tags

**Success Criteria**: Article about 'sustainable farming practices' generates tags like #sustainability, #agriculture, #environment, #farming, #green-tech automatically."

### 4. Duplicate Detection

**Prompt:**
"Implement a duplicate detection system that identifies similar or duplicate content using embeddings and similarity scoring to prevent redundant content.

**Tech Stack**: OpenAI Embeddings API + cosine similarity calculation

**Database Schema**: Add to shared/schema.ts:
- duplicate_pairs table: id, content_id_1, content_id_2, similarity_score, status, reviewed_at
- Add similarity_hash column to main content table

**API Routes**:
- POST /api/duplicates/check - Check if content is duplicate before saving
- GET /api/duplicates/pending - List potential duplicates for review
- POST /api/duplicates/resolve - Mark as duplicate or unique
- GET /api/duplicates/stats - Duplicate detection statistics

**UI Components**:
- DuplicateWarning modal before submission
- DuplicateComparison side-by-side viewer
- DuplicateManager dashboard for admins
- SimilarityScore visualization (0-100%)

**Success Criteria**: Detect when user tries to submit content that is >85% similar to existing content and warn them with option to edit or merge."

### 5. Related Content Discovery

**Prompt:**
"Build a related content recommendation system that finds semantically similar items using embeddings to keep users engaged with relevant content.

**Tech Stack**: OpenAI Embeddings API + vector similarity search

**Database Schema**: Add to shared/schema.ts:
- content_embeddings table: content_id, embedding, updated_at
- related_content_cache table: content_id, related_ids (jsonb), expires_at

**API Routes**:
- GET /api/content/:id/related - Get related content for an item
- POST /api/content/embeddings/refresh - Refresh embeddings
- GET /api/recommendations/user/:userId - Personalized recommendations

**UI Components**:
- RelatedContent sidebar widget
- ContentCard with similarity percentage
- RecommendationCarousel component
- "More Like This" section

**Success Criteria**: When viewing article about 'machine learning', show related articles about AI, neural networks, data science with relevance scores."

### 6. Natural Language Query Understanding

**Prompt:**
"Create a natural language to database query system that converts user questions in plain English into database queries and returns formatted results.

**Tech Stack**: OpenAI GPT-4 API + SQL query validation

**Database Schema**: Add to shared/schema.ts:
- query_logs table: id, natural_query, generated_sql, result_count, user_id, execution_time

**API Routes**:
- POST /api/query/natural - Convert natural language to SQL
- POST /api/query/execute - Execute validated query safely
- GET /api/query/history - User's query history
- POST /api/query/save - Save useful queries

**UI Components**:
- NaturalQueryInput with examples
- QueryResults table with export
- QueryBuilder visual interface
- SavedQueries dropdown

**Success Criteria**: User asks 'Show me all users who signed up last month' and gets accurate results from database query."

---

## 💬 AI Assistant & Chat

### 7. AI Chat Assistant

**Prompt:**
"Implement an AI-powered chat assistant that can answer user questions, provide help with app features, and maintain conversation context across sessions.

**Tech Stack**: OpenAI GPT-4 API + conversation memory

**Database Schema**: Add to shared/schema.ts:
- conversations table: id, user_id, title, created_at, updated_at
- messages table: id, conversation_id, role, content, tokens_used, timestamp
- conversation_context table: conversation_id, context_summary, key_facts

**API Routes**:
- POST /api/chat/message - Send message to assistant
- GET /api/chat/conversations - List user conversations
- GET /api/chat/conversation/:id - Get conversation history
- DELETE /api/chat/conversation/:id - Delete conversation
- POST /api/chat/feedback - Rate assistant response

**UI Components**:
- ChatInterface with message bubbles
- ConversationSidebar for history
- TypingIndicator component
- QuickActions buttons for common queries
- ChatWidget floating button

**Success Criteria**: User can have multi-turn conversation about app features with context maintained, assistant provides helpful accurate responses."

### 8. Voice Commands

**Prompt:**
"Add voice command capabilities allowing users to control the app using speech recognition and natural language processing.

**Tech Stack**: OpenAI Whisper API + Web Speech API fallback

**Database Schema**: Add to shared/schema.ts:
- voice_commands table: id, user_id, transcript, command_type, action_taken, success, timestamp

**API Routes**:
- POST /api/voice/transcribe - Convert audio to text
- POST /api/voice/interpret - Interpret command intent
- GET /api/voice/commands - List available commands
- GET /api/voice/history - User's voice command history

**UI Components**:
- VoiceButton with recording animation
- VoicePermission modal
- TranscriptDisplay showing real-time text
- VoiceCommandHelper showing available commands
- VoiceFeedback confirmation

**Success Criteria**: User says 'Show me my recent orders' and app navigates to orders page with correct filters applied."

### 9. Smart Email/Message Drafting

**Prompt:**
"Build an intelligent message drafting assistant that generates contextual responses for emails, messages, or comments based on conversation history.

**Tech Stack**: OpenAI GPT-3.5-turbo API

**Database Schema**: Add to shared/schema.ts:
- draft_templates table: id, context_type, template_prompt, usage_count
- generated_drafts table: id, original_message_id, draft_content, selected, edited, user_id

**API Routes**:
- POST /api/drafts/generate - Generate draft responses
- POST /api/drafts/feedback - Track if draft was used/edited
- GET /api/drafts/templates - Get draft templates
- POST /api/drafts/improve - Improve existing draft

**UI Components**:
- DraftSuggestions showing 3 options
- DraftEditor with tone selector
- RegenerateButton for new options
- DraftCustomizer (formal/casual/friendly)
- QuickReply buttons

**Success Criteria**: User receives customer complaint, AI generates 3 appropriate response options with different tones (apologetic, solution-focused, empathetic)."

### 10. Writing Assistant

**Prompt:**
"Create a comprehensive writing assistant that provides grammar checking, style suggestions, tone adjustment, and content improvement recommendations.

**Tech Stack**: OpenAI GPT-3.5-turbo + TensorFlow.js grammar model

**Database Schema**: Add to shared/schema.ts:
- writing_sessions table: id, user_id, document_id, original_text, improved_text, improvements_applied
- writing_suggestions table: id, session_id, suggestion_type, original_snippet, suggested_snippet, accepted

**API Routes**:
- POST /api/writing/analyze - Analyze text for improvements
- POST /api/writing/grammar - Check grammar only
- POST /api/writing/tone - Adjust tone of text
- POST /api/writing/expand - Expand bullet points to paragraphs
- POST /api/writing/summarize - Create summary

**UI Components**:
- WritingEditor with inline suggestions
- GrammarHighlighter with underlines
- ToneSelector slider (formal ↔ casual)
- SuggestionSidebar with accept/reject
- WritingStats (readability, word count, tone)

**Success Criteria**: User writes 'i think we should definately procceed with the project' and gets corrections for spelling and suggestions for more professional tone."

---

## 📝 Content Generation & Enhancement

### 11. Auto-Summarization

**Prompt:**
"Implement automatic summarization that creates concise TL;DR versions of long content, articles, or documents while preserving key information.

**Tech Stack**: OpenAI GPT-3.5-turbo API

**Database Schema**: Add to shared/schema.ts:
- summaries table: id, content_id, summary_text, summary_type (tldr/bullet/paragraph), word_count

**API Routes**:
- POST /api/summarize - Generate summary of content
- GET /api/content/:id/summary - Get cached summary
- POST /api/summarize/batch - Bulk summarize multiple items
- PUT /api/summarize/:id - Edit/improve summary

**UI Components**:
- SummaryCard with expand to full
- SummaryToggle button (Show TL;DR)
- SummaryLength selector (1-3 sentences)
- BulletSummary component
- KeyPoints highlighter

**Success Criteria**: 1000-word article gets accurate 2-3 sentence summary that captures main points, user can choose between paragraph and bullet format."

### 12. Smart Excerpts

**Prompt:**
"Build a smart excerpt generator that creates compelling preview snippets for content, optimized for sharing and preview cards.

**Tech Stack**: OpenAI GPT-3.5-turbo API

**Database Schema**: Add to shared/schema.ts:
- excerpts table: id, content_id, excerpt_text, excerpt_type, click_through_rate
- excerpt_performance table: excerpt_id, views, clicks, shares

**API Routes**:
- POST /api/excerpts/generate - Create excerpt variants
- GET /api/excerpts/test - A/B test different excerpts
- GET /api/excerpts/performance - Track excerpt metrics
- PUT /api/excerpts/optimize - Improve based on performance

**UI Components**:
- ExcerptPreview card component
- ExcerptEditor with preview
- SocialPreview (Twitter/LinkedIn/FB)
- ExcerptTester for A/B variants
- PerformanceMetrics dashboard

**Success Criteria**: Generate engaging excerpt that increases click-through rate by 20% compared to first paragraph, works well in social media previews."

### 13. Multi-Language Translation

**Prompt:**
"Create a real-time translation system that automatically translates content into multiple languages while preserving formatting and context.

**Tech Stack**: OpenAI GPT-3.5-turbo API + language detection

**Database Schema**: Add to shared/schema.ts:
- translations table: id, content_id, language_code, translated_text, is_verified, translator_id
- language_preferences table: user_id, preferred_languages, auto_translate

**API Routes**:
- POST /api/translate - Translate content
- GET /api/translate/detect - Detect language
- GET /api/content/:id/translations - Get all translations
- POST /api/translate/verify - Mark translation as verified
- GET /api/languages/supported - List supported languages

**UI Components**:
- LanguageSelector dropdown
- TranslationToggle switch
- TranslatedContent with flag icons
- TranslationQuality indicator
- LanguagePreferences settings

**Success Criteria**: User content in English automatically available in Spanish, French, German with context-aware translations, not just literal word-for-word."

### 14. Alt Text Generation

**Prompt:**
"Implement automatic alt text generation for images to improve accessibility, SEO, and provide descriptions for screen readers.

**Tech Stack**: OpenAI GPT-4-Vision API

**Database Schema**: Add to shared/schema.ts:
- image_metadata table: id, image_url, alt_text, generated_alt, title, is_decorative
- alt_text_quality table: image_id, quality_score, accessibility_score

**API Routes**:
- POST /api/images/alt-text - Generate alt text for image
- POST /api/images/bulk-alt - Batch process multiple images
- PUT /api/images/:id/alt-text - Update alt text
- GET /api/accessibility/report - Accessibility audit

**UI Components**:
- ImageUploader with alt text preview
- AltTextEditor with suggestions
- AccessibilityScore indicator
- BulkAltGenerator for existing images
- ScreenReaderPreview component

**Success Criteria**: Upload image of person using laptop, get descriptive alt text like 'Person working on laptop at wooden desk with coffee cup nearby' automatically."

### 15. Theme Generation

**Prompt:**
"Build an AI-powered theme generator that creates cohesive color schemes, typography pairings, and design tokens based on user preferences or brand.

**Tech Stack**: OpenAI GPT-4 API + Color.js for color manipulation

**Database Schema**: Add to shared/schema.ts:
- themes table: id, name, colors (jsonb), typography (jsonb), spacing (jsonb), user_id
- theme_ratings table: theme_id, rating, feedback, user_id

**API Routes**:
- POST /api/themes/generate - Generate theme from description
- POST /api/themes/from-image - Extract theme from image
- GET /api/themes/trending - Popular themes
- POST /api/themes/apply - Apply theme to app
- POST /api/themes/export - Export as CSS/JSON

**UI Components**:
- ThemeGenerator with input prompt
- ColorPalette preview grid
- ThemePreview with live demo
- ThemeCustomizer sliders
- ThemeExporter with format options

**Success Criteria**: User inputs 'modern minimalist tech startup' and gets complete theme with primary/secondary colors, fonts, spacing that work well together."

### 16. Avatar Generation

**Prompt:**
"Create an avatar generation system that creates unique user avatars based on usernames, preferences, or AI-generated artistic representations.

**Tech Stack**: DiceBear Avatars API + OpenAI DALL-E API for custom

**Database Schema**: Add to shared/schema.ts:
- avatars table: id, user_id, avatar_url, avatar_style, seed_value, is_custom
- avatar_history table: user_id, avatar_url, used_from, used_until

**API Routes**:
- POST /api/avatars/generate - Generate avatar options
- POST /api/avatars/custom - Create AI-generated avatar
- GET /api/avatars/styles - List available styles
- PUT /api/users/:id/avatar - Update user avatar
- GET /api/avatars/gallery - Browse avatar gallery

**UI Components**:
- AvatarPicker with style options
- AvatarPreview at different sizes
- AvatarCustomizer with parameters
- AvatarGallery grid view
- AvatarUploader for custom images

**Success Criteria**: New user gets unique, visually appealing avatar automatically generated from username, can regenerate with different styles until satisfied."

---

## 🛡️ Moderation & Quality

### 17. Content Moderation

**Prompt:**
"Implement AI-powered content moderation that detects and filters inappropriate content, toxicity, spam, and policy violations in real-time.

**Tech Stack**: TensorFlow.js Toxicity model + OpenAI Moderation API

**Database Schema**: Add to shared/schema.ts:
- moderation_logs table: id, content_id, user_id, toxicity_scores (jsonb), action_taken, reviewed_by
- blocked_content table: id, content, reason, user_id, timestamp
- moderation_appeals table: id, content_id, appeal_reason, status, decision

**API Routes**:
- POST /api/moderate/check - Check content before posting
- GET /api/moderate/queue - Review queue for moderators
- POST /api/moderate/action - Take moderation action
- POST /api/moderate/appeal - Appeal moderation decision
- GET /api/moderate/stats - Moderation statistics

**UI Components**:
- ModerationWarning before submit
- ToxicityScore indicator (0-100%)
- ModerationQueue dashboard
- AppealForm with reason input
- ModerationStats charts

**Success Criteria**: Toxic comment gets blocked automatically with explanation, user can edit to make appropriate, false positives can be appealed."

### 18. Fraud Detection

**Prompt:**
"Build a fraud detection system that identifies suspicious user behavior, fake accounts, and potentially fraudulent transactions using pattern recognition.

**Tech Stack**: TensorFlow.js + OpenAI GPT-3.5 for pattern analysis

**Database Schema**: Add to shared/schema.ts:
- fraud_scores table: id, user_id, score, factors (jsonb), timestamp
- suspicious_activities table: id, user_id, activity_type, details, risk_level
- fraud_reviews table: id, user_id, reviewer_id, decision, notes

**API Routes**:
- POST /api/fraud/analyze - Analyze user behavior
- GET /api/fraud/alerts - Active fraud alerts
- POST /api/fraud/report - Report suspicious activity
- PUT /api/fraud/review - Manual review decision
- GET /api/fraud/patterns - Fraud pattern insights

**UI Components**:
- FraudRiskIndicator (low/medium/high)
- SuspiciousActivityAlert banner
- FraudReviewDashboard for admins
- UserRiskProfile detailed view
- FraudMetrics real-time display

**Success Criteria**: Detect when new account immediately tries unusual transaction pattern, flag for review, prevent potential fraud with 90% accuracy."

### 19. Sentiment Analysis

**Prompt:**
"Create a sentiment analysis system that understands user emotions in text, categorizing content as positive, negative, or neutral with nuanced emotion detection.

**Tech Stack**: TensorFlow.js sentiment model + OpenAI for nuanced analysis

**Database Schema**: Add to shared/schema.ts:
- sentiment_analysis table: id, content_id, sentiment (positive/negative/neutral), confidence, emotions (jsonb)
- sentiment_trends table: time_period, avg_sentiment, total_analyzed

**API Routes**:
- POST /api/sentiment/analyze - Analyze text sentiment
- GET /api/sentiment/user/:id - User sentiment history
- GET /api/sentiment/trends - Sentiment trends over time
- GET /api/sentiment/insights - Sentiment insights dashboard

**UI Components**:
- SentimentIndicator emoji/color
- EmotionTags (happy, sad, angry, etc)
- SentimentTrend line chart
- SentimentHeatmap by topic
- MoodBoard user dashboard

**Success Criteria**: Analyze customer review 'The product arrived late but quality exceeded expectations!' as mixed sentiment (negative delivery, positive quality)."

### 20. Sentiment Tracking

**Prompt:**
"Build a sentiment tracking dashboard that monitors overall user satisfaction trends, identifies pain points, and alerts on significant sentiment changes.

**Tech Stack**: Aggregated sentiment analysis + OpenAI for insights

**Database Schema**: Add to shared/schema.ts:
- sentiment_metrics table: id, period, avg_sentiment, total_items, alert_triggered
- sentiment_alerts table: id, alert_type, threshold, current_value, triggered_at
- sentiment_segments table: segment_name, period, sentiment_score

**API Routes**:
- GET /api/sentiment/dashboard - Main metrics dashboard
- GET /api/sentiment/alerts/active - Active sentiment alerts
- POST /api/sentiment/alerts/config - Configure alert thresholds
- GET /api/sentiment/breakdown - Sentiment by category/feature
- GET /api/sentiment/report - Generate sentiment report

**UI Components**:
- SentimentDashboard overview
- SentimentAlerts notification panel
- SentimentChart with time selector
- SegmentComparison charts
- SentimentReport PDF generator

**Success Criteria**: Dashboard shows 15% drop in sentiment over past week, identifies login issues as main cause, alerts admin team automatically."

---

## 🎯 User Experience

### 21. Content Personalization

**Prompt:**
"Implement a personalization engine that learns user preferences and recommends relevant content based on behavior, interests, and similar users.

**Tech Stack**: OpenAI Embeddings + collaborative filtering

**Database Schema**: Add to shared/schema.ts:
- user_preferences table: user_id, categories (jsonb), tags (jsonb), interaction_history
- recommendations table: user_id, content_id, score, reason, shown_at, clicked
- user_similarities table: user_id_1, user_id_2, similarity_score

**API Routes**:
- GET /api/personalize/feed - Personalized content feed
- POST /api/personalize/feedback - Track user interactions
- GET /api/personalize/preferences - Get user preferences
- PUT /api/personalize/preferences - Update preferences
- GET /api/personalize/explore - Exploration recommendations

**UI Components**:
- PersonalizedFeed with infinite scroll
- PreferenceSelector onboarding
- WhyRecommended explanation
- PersonalizationToggle on/off
- InterestManager settings page

**Success Criteria**: User who frequently reads tech articles sees more tech content ranked higher, with 30% improvement in engagement metrics."

### 22. Smart Notifications

**Prompt:**
"Build an intelligent notification system that predicts which notifications users want to receive and optimizes delivery timing for maximum engagement.

**Tech Stack**: TensorFlow.js + OpenAI for notification ranking

**Database Schema**: Add to shared/schema.ts:
- notification_preferences table: user_id, notification_types (jsonb), quiet_hours, frequency_limit
- notification_scores table: notification_id, user_id, relevance_score, optimal_time
- notification_feedback table: notification_id, user_id, action (clicked/dismissed/disabled)

**API Routes**:
- POST /api/notifications/smart-send - Send with smart timing
- GET /api/notifications/preferences - User preferences
- PUT /api/notifications/preferences - Update preferences
- POST /api/notifications/feedback - Track interaction
- GET /api/notifications/insights - Delivery insights

**UI Components**:
- NotificationCenter with grouping
- NotificationPreferences detailed UI
- QuietHours time selector
- NotificationPreview test sender
- EngagementMetrics dashboard

**Success Criteria**: System learns user checks app at 9am and 5pm, delays non-urgent notifications to these times, achieving 50% higher click rate."

### 23. Smart Auto-Save

**Prompt:**
"Create an intelligent auto-save system that predicts when users are done typing and saves their work without interrupting their flow.

**Tech Stack**: TensorFlow.js for pause detection + debouncing logic

**Database Schema**: Add to shared/schema.ts:
- auto_save_drafts table: id, user_id, content, version, saved_at
- save_patterns table: user_id, avg_pause_duration, typing_speed, save_frequency

**API Routes**:
- POST /api/autosave/draft - Save draft version
- GET /api/autosave/restore - Restore latest draft
- GET /api/autosave/versions - List versions
- DELETE /api/autosave/draft/:id - Delete draft
- GET /api/autosave/patterns - User typing patterns

**UI Components**:
- AutoSaveIndicator with status
- VersionHistory dropdown
- RestoreDraft modal
- SavingSpinner animation
- ConflictResolver for simultaneous edits

**Success Criteria**: Detect natural pauses in typing (2-3 seconds after sentence completion), save without interrupting, show unobtrusive 'Saved' indicator."

### 24. Auto-Complete Forms

**Prompt:**
"Implement smart form auto-completion that predicts what users will type next based on context, previous inputs, and common patterns.

**Tech Stack**: TensorFlow.js + OpenAI for context understanding

**Database Schema**: Add to shared/schema.ts:
- form_completions table: field_name, common_values (jsonb), usage_count
- user_form_history table: user_id, field_name, values_used (jsonb)
- completion_feedback table: suggestion_id, was_selected, final_value

**API Routes**:
- GET /api/autocomplete/suggestions - Get suggestions for field
- POST /api/autocomplete/learn - Learn from user input
- GET /api/autocomplete/context - Context-aware suggestions
- DELETE /api/autocomplete/history - Clear user history

**UI Components**:
- AutoCompleteInput with dropdown
- SuggestionList with keyboard nav
- SmartFormField wrapper component
- FormMemory toggle on/off
- AutoFillAll button

**Success Criteria**: User starts typing email, system suggests their previously used email, typing city name suggests state/country automatically."

### 25. Smart Form Validation

**Prompt:**
"Build intelligent form validation that provides helpful suggestions, detects common mistakes, and guides users to correct input formats.

**Tech Stack**: OpenAI GPT-3.5 + regex patterns

**Database Schema**: Add to shared/schema.ts:
- validation_rules table: field_type, rules (jsonb), error_messages, suggestions
- validation_errors table: field_name, error_type, frequency, user_resolution

**API Routes**:
- POST /api/validate/field - Validate single field
- POST /api/validate/form - Validate entire form
- GET /api/validate/suggestions - Get fix suggestions
- POST /api/validate/learn - Learn from corrections

**UI Components**:
- SmartValidation error messages
- SuggestionTooltip with fixes
- ValidationSuccess checkmarks
- FormatHelper showing examples
- InlineCorrection one-click fixes

**Success Criteria**: User enters phone '555-1234', system suggests adding area code, detects international formats, provides one-click formatting fix."

---

## 📊 Analytics & Intelligence

### 26. Analytics Insights

**Prompt:**
"Create an AI-powered analytics interpreter that explains data trends, patterns, and anomalies in plain language for non-technical users.

**Tech Stack**: OpenAI GPT-4 for data interpretation

**Database Schema**: Add to shared/schema.ts:
- analytics_insights table: id, metric_name, insight_text, importance, period, created_at
- insight_feedback table: insight_id, helpful_score, user_id, comments

**API Routes**:
- GET /api/insights/generate - Generate insights from data
- GET /api/insights/daily - Daily insight summary
- POST /api/insights/explain - Explain specific metric
- POST /api/insights/feedback - Rate insight helpfulness
- GET /api/insights/subscribe - Subscribe to insights

**UI Components**:
- InsightCard with plain language
- TrendExplanation with visuals
- AnomalyAlert highlighting unusual
- InsightDigest email/dashboard
- AskAnalytics question interface

**Success Criteria**: System detects 40% traffic spike on Tuesday, explains 'Your website had 40% more visitors than usual on Tuesday, likely due to the newsletter campaign sent that morning.'"

### 27. User Behavior Prediction

**Prompt:**
"Build a predictive system that anticipates user actions, identifies likely churn, and suggests proactive interventions to improve retention.

**Tech Stack**: TensorFlow.js + OpenAI for pattern analysis

**Database Schema**: Add to shared/schema.ts:
- user_predictions table: user_id, prediction_type, probability, predicted_date, factors (jsonb)
- prediction_accuracy table: prediction_id, actual_outcome, accuracy_score

**API Routes**:
- GET /api/predict/user/:id - User predictions
- GET /api/predict/churn - Churn risk users
- POST /api/predict/intervention - Suggest intervention
- GET /api/predict/segments - Predictive segments
- GET /api/predict/accuracy - Model accuracy

**UI Components**:
- ChurnRiskIndicator (low/med/high)
- PredictedActions timeline
- InterventionSuggestions panel
- RetentionDashboard overview
- PredictionAccuracy metrics

**Success Criteria**: Identify users with 80% churn probability based on decreased activity pattern, trigger retention email campaign, reduce churn by 25%."

### 28. Trend Detection

**Prompt:**
"Implement automatic trend detection that identifies emerging patterns, topics, and behaviors in your data and alerts on significant changes.

**Tech Stack**: TensorFlow.js time series + OpenAI for interpretation

**Database Schema**: Add to shared/schema.ts:
- trends table: id, trend_name, trend_type, strength, start_date, peak_date
- trend_alerts table: trend_id, alert_type, threshold, triggered_at, notified_users

**API Routes**:
- GET /api/trends/current - Current active trends
- GET /api/trends/emerging - Newly detected trends
- POST /api/trends/analyze - Analyze for trends
- POST /api/trends/subscribe - Subscribe to trend alerts
- GET /api/trends/historical - Historical trends

**UI Components**:
- TrendDashboard with charts
- TrendingTopics tag cloud
- TrendAlert notifications
- TrendTimeline visualization
- TrendPredictor future trends

**Success Criteria**: Detect emerging topic 'sustainable packaging' mentioned 300% more this week, alert product team about growing customer interest."

### 29. A/B Test Analysis

**Prompt:**
"Create an AI system that analyzes A/B test results, determines statistical significance, and provides plain-language recommendations for decision making.

**Tech Stack**: Statistical analysis + OpenAI GPT-3.5 for interpretation

**Database Schema**: Add to shared/schema.ts:
- ab_tests table: id, name, variant_a, variant_b, start_date, end_date, status
- ab_test_results table: test_id, variant, conversions, visitors, revenue
- ab_test_insights table: test_id, winner, confidence, recommendation, explanation

**API Routes**:
- POST /api/ab/create - Create new test
- GET /api/ab/results/:id - Get test results
- POST /api/ab/analyze - Analyze significance
- GET /api/ab/recommendations - Get recommendations
- POST /api/ab/implement - Implement winner

**UI Components**:
- ABTestDashboard overview
- VariantComparison side-by-side
- SignificanceCalculator with graph
- RecommendationCard with action
- TestHistory with learnings

**Success Criteria**: A/B test shows variant B has 15% higher conversion, AI explains 'Variant B's shorter form reduced friction, achieving statistical significance with 95% confidence.'"

### 30. Cohort Analysis

**Prompt:**
"Build intelligent cohort analysis that segments users, tracks their behavior over time, and provides insights about different user groups.

**Tech Stack**: SQL analysis + OpenAI for insights

**Database Schema**: Add to shared/schema.ts:
- cohorts table: id, name, definition (jsonb), created_date, user_count
- cohort_metrics table: cohort_id, metric_name, period, value
- cohort_insights table: cohort_id, insight, importance, action_recommended

**API Routes**:
- POST /api/cohorts/create - Define new cohort
- GET /api/cohorts/analyze - Analyze cohort behavior
- GET /api/cohorts/compare - Compare cohorts
- GET /api/cohorts/retention - Retention analysis
- GET /api/cohorts/insights - AI-generated insights

**UI Components**:
- CohortBuilder with filters
- RetentionTable heatmap
- CohortComparison charts
- InsightCards with actions
- CohortTimeline evolution

**Success Criteria**: Identify January signups have 50% higher retention than February, AI explains 'January users came from Product Hunt launch, showing stronger product-market fit.'"

### 31. Predictive Maintenance

**Prompt:**
"Implement predictive maintenance that forecasts when system components might fail or need attention based on usage patterns and historical data.

**Tech Stack**: TensorFlow.js time series + anomaly detection

**Database Schema**: Add to shared/schema.ts:
- system_metrics table: id, component, metric_name, value, timestamp
- maintenance_predictions table: component, predicted_issue, probability, recommended_date
- maintenance_history table: component, issue, resolved_at, downtime_minutes

**API Routes**:
- GET /api/maintenance/predict - Get predictions
- POST /api/maintenance/analyze - Analyze component
- GET /api/maintenance/schedule - Suggested schedule
- POST /api/maintenance/complete - Log maintenance
- GET /api/maintenance/health - System health score

**UI Components**:
- SystemHealthDashboard overview
- MaintenanceCalendar scheduler
- ComponentHealth individual status
- AlertTimeline upcoming issues
- DowntimePredictor impact analysis

**Success Criteria**: Predict database needs optimization in 7 days based on query performance degradation trend, schedule maintenance during low-traffic period."

---

## 📈 Productivity

### 32. Smart Scheduling

**Prompt:**
"Build an AI scheduling assistant that finds optimal meeting times, considers participant preferences, and minimizes scheduling conflicts.

**Tech Stack**: OpenAI GPT-3.5 + calendar integration logic

**Database Schema**: Add to shared/schema.ts:
- scheduling_preferences table: user_id, preferred_times (jsonb), timezone, buffer_time
- meeting_suggestions table: meeting_id, suggested_times (jsonb), confidence_scores
- scheduling_patterns table: user_id, common_meeting_times, meeting_frequency

**API Routes**:
- POST /api/schedule/suggest - Suggest meeting times
- POST /api/schedule/optimize - Optimize existing schedule
- GET /api/schedule/conflicts - Find conflicts
- PUT /api/schedule/preferences - Update preferences
- GET /api/schedule/analytics - Scheduling analytics

**UI Components**:
- TimeSlotPicker with AI suggestions
- AvailabilityGrid heat map
- ConflictResolver interface
- ScheduleOptimizer one-click
- MeetingInsights dashboard

**Success Criteria**: AI finds optimal time for 5-person meeting considering time zones, previous patterns, and minimizing everyone's schedule disruption."

### 33. Smart Routing

**Prompt:**
"Create intelligent routing system for support tickets that automatically assigns them to the right team/person based on content and expertise.

**Tech Stack**: OpenAI GPT-3.5 for classification + routing logic

**Database Schema**: Add to shared/schema.ts:
- routing_rules table: id, condition (jsonb), assigned_to, priority
- ticket_routing table: ticket_id, routed_to, confidence_score, routing_reason
- agent_expertise table: agent_id, skills (jsonb), availability, current_load

**API Routes**:
- POST /api/routing/assign - Auto-assign ticket
- GET /api/routing/suggest - Suggest assignment
- POST /api/routing/escalate - Escalate ticket
- PUT /api/routing/rules - Update routing rules
- GET /api/routing/performance - Routing metrics

**UI Components**:
- TicketRouter assignment UI
- RoutingSuggestion with reason
- EscalationPath visualization
- WorkloadBalancer dashboard
- RoutingRules configurator

**Success Criteria**: Technical support ticket about API automatically routed to backend team, billing question to finance, with 90% accuracy rate."

### 34. Data Extraction

**Prompt:**
"Build a system that extracts structured data from unstructured text like emails, documents, and messages using NLP.

**Tech Stack**: OpenAI GPT-3.5 with structured output

**Database Schema**: Add to shared/schema.ts:
- extraction_templates table: id, name, schema (jsonb), example_text
- extracted_data table: id, source_id, template_id, extracted_fields (jsonb), confidence

**API Routes**:
- POST /api/extract/data - Extract from text
- POST /api/extract/template - Create template
- POST /api/extract/batch - Batch extraction
- GET /api/extract/verify - Verify extraction
- POST /api/extract/correct - Correct extraction

**UI Components**:
- ExtractionPreview highlighted fields
- TemplateBuilder drag-and-drop
- ExtractionReview interface
- BatchProcessor with progress
- DataValidator with corrections

**Success Criteria**: Extract order details (customer name, items, quantities, delivery address) from unstructured email with 95% accuracy."

### 35. Dynamic Pricing

**Prompt:**
"Implement AI-driven dynamic pricing that optimizes prices based on demand, competition, inventory, and user behavior patterns.

**Tech Stack**: TensorFlow.js + OpenAI for market analysis

**Database Schema**: Add to shared/schema.ts:
- pricing_rules table: id, product_id, base_price, min_price, max_price, factors (jsonb)
- price_history table: product_id, price, changed_at, demand_level, inventory_level
- pricing_performance table: product_id, price_point, conversion_rate, revenue

**API Routes**:
- GET /api/pricing/optimize - Get optimal price
- POST /api/pricing/simulate - Simulate pricing
- GET /api/pricing/competition - Competitor analysis
- PUT /api/pricing/rules - Update rules
- GET /api/pricing/report - Performance report

**UI Components**:
- PricingDashboard overview
- DemandCurve visualization
- PriceSimulator what-if tool
- CompetitorPricing tracker
- RevenueImpact projections

**Success Criteria**: Increase prices by 10% during high demand periods, offer 15% discount when inventory high, achieving 20% revenue increase."

---

## 🎨 Media Processing

### 36. Image Enhancement

**Prompt:**
"Build an image enhancement system with auto-crop, background removal, quality improvement, and smart filters using AI.

**Tech Stack**: Remove.bg API + Sharp.js for processing

**Database Schema**: Add to shared/schema.ts:
- image_processing table: id, original_url, processed_url, operations (jsonb), processing_time
- image_presets table: id, name, operations (jsonb), usage_count

**API Routes**:
- POST /api/images/enhance - Auto-enhance image
- POST /api/images/background - Remove background
- POST /api/images/crop - Smart crop to subject
- POST /api/images/batch - Batch process
- GET /api/images/presets - Enhancement presets

**UI Components**:
- ImageEditor with tools
- BeforeAfter slider comparison
- PresetSelector quick enhance
- BatchUploader for multiple
- QualitySettings optimizer

**Success Criteria**: Upload product photo with messy background, get clean white background version, smart cropped to product, enhanced colors."

### 37. Image Classification

**Prompt:**
"Create an image classification system that automatically identifies and categorizes images based on their content.

**Tech Stack**: TensorFlow.js MobileNet model

**Database Schema**: Add to shared/schema.ts:
- image_classifications table: image_id, labels (jsonb), confidence_scores (jsonb)
- classification_feedback table: image_id, correct_label, user_id

**API Routes**:
- POST /api/classify/image - Classify single image
- POST /api/classify/batch - Batch classification
- POST /api/classify/feedback - Correct classification
- GET /api/classify/stats - Classification statistics

**UI Components**:
- ImageTagger with labels
- ConfidenceBar for each label
- ClassificationReview interface
- BatchResults gallery view
- LabelManager for categories

**Success Criteria**: Upload photo of golden retriever, system identifies 'dog', 'golden retriever', 'pet', 'animal' with confidence scores."

### 38. Face Detection

**Prompt:**
"Implement face detection for user avatars, authentication, and privacy features like automatic face blurring.

**Tech Stack**: TensorFlow.js BlazeFace model

**Database Schema**: Add to shared/schema.ts:
- face_detections table: image_id, faces_detected, face_coordinates (jsonb)
- privacy_settings table: user_id, auto_blur_faces, face_recognition_enabled

**API Routes**:
- POST /api/faces/detect - Detect faces in image
- POST /api/faces/blur - Blur detected faces
- POST /api/faces/crop - Crop to face
- GET /api/faces/count - Count faces

**UI Components**:
- FaceDetector with boxes
- PrivacyBlur toggle
- FaceCropper for avatars
- FaceCounter for groups
- AnonymizeToggle setting

**Success Criteria**: Upload group photo, detect all 5 faces, offer option to blur faces for privacy, auto-crop individual avatar photos."

### 39. OCR Text Extraction

**Prompt:**
"Build OCR (Optical Character Recognition) to extract text from images, PDFs, and scanned documents.

**Tech Stack**: Tesseract.js for OCR processing

**Database Schema**: Add to shared/schema.ts:
- ocr_results table: id, image_id, extracted_text, confidence, language
- ocr_corrections table: result_id, original_text, corrected_text, user_id

**API Routes**:
- POST /api/ocr/extract - Extract text from image
- POST /api/ocr/document - Process entire document
- POST /api/ocr/correct - Submit corrections
- GET /api/ocr/languages - Supported languages

**UI Components**:
- OCRUploader with preview
- ExtractedText editable display
- HighlightedRegions on image
- LanguageSelector dropdown
- CopyButton for results

**Success Criteria**: Upload photo of restaurant receipt, extract all text including items and prices, allow user to correct any errors, export as structured data."

### 40. Speech-to-Text

**Prompt:**
"Implement speech-to-text transcription using Whisper API for voice notes, meeting transcription, and accessibility features.

**Tech Stack**: OpenAI Whisper API

**Database Schema**: Add to shared/schema.ts:
- transcriptions table: id, audio_url, transcript, duration, language, user_id
- transcript_edits table: transcription_id, original_segment, edited_segment, timestamp

**API Routes**:
- POST /api/transcribe/audio - Transcribe audio file
- POST /api/transcribe/stream - Real-time transcription
- PUT /api/transcribe/edit - Edit transcript
- GET /api/transcribe/export - Export formats

**UI Components**:
- AudioRecorder with waveform
- TranscriptEditor synchronized
- PlaybackControls with speed
- TimestampJump clickable
- ExportOptions (SRT, TXT, DOC)

**Success Criteria**: Record 5-minute meeting, get accurate transcript with timestamps, edit any errors, export as subtitles or document."

---

## Usage Instructions

1. **Choose Your Feature**: Browse through the categories and select the ML feature you want to implement.

2. **Copy the Prompt**: Copy the entire prompt for your chosen feature.

3. **Use the Prompt**: Paste it into your development environment or AI assistant.

4. **Customize as Needed**: Modify the specifications based on your specific requirements.

5. **Implement Step by Step**: Follow the structure provided:
   - Update database schema first
   - Implement backend APIs
   - Build UI components
   - Test against success criteria

6. **Stack Considerations**: 
   - Most features use OpenAI API (make sure to set up API keys)
   - Some use TensorFlow.js for client-side ML (no API needed)
   - All assume React + Express + TypeScript + PostgreSQL stack

7. **Dependencies**: Each prompt includes the specific tech stack needed. Make sure to install required packages:
   - OpenAI: `npm install openai`
   - TensorFlow.js: `npm install @tensorflow/tfjs @tensorflow/tfjs-node`
   - Other specific libraries as mentioned in each prompt

8. **Testing**: Each prompt includes success criteria - use these to verify your implementation works correctly.

9. **Iterate**: Start with basic implementation, then enhance based on user feedback and performance metrics.

## Notes

- These prompts are designed to work with your existing full-stack JavaScript setup
- Database schemas follow Drizzle ORM patterns
- API routes follow RESTful conventions
- UI components assume shadcn/ui component library
- All features include user feedback mechanisms for continuous improvement
- Consider rate limiting and caching for API-heavy features
- Implement proper error handling and fallbacks
- Monitor costs for API-based services (OpenAI, etc.)

## Quick Start Combinations

For a comprehensive AI-powered application, consider implementing these combinations:

**Content Platform**: Smart Search + Auto-tagging + Content Moderation + Personalization
**E-commerce**: Image Enhancement + Product Classification + Dynamic Pricing + Recommendation
**Communication App**: Chat Assistant + Sentiment Analysis + Smart Notifications + Translation
**Analytics Dashboard**: Analytics Insights + Trend Detection + Predictive Analytics + A/B Testing
**Productivity Suite**: Smart Scheduling + Email Drafting + Data Extraction + Task Routing