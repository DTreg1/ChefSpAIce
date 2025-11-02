CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" varchar(100) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" varchar,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alt_text_quality" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_id" varchar NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"accessibility_score" integer DEFAULT 0 NOT NULL,
	"length_score" integer,
	"descriptive_score" integer,
	"context_score" integer,
	"keyword_score" integer,
	"screen_reader_score" integer,
	"wcag_level" varchar(3),
	"has_color_description" boolean DEFAULT false,
	"has_text_description" boolean DEFAULT false,
	"user_feedback" text,
	"manually_reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_by" varchar,
	"review_notes" text,
	"issues" text[],
	"suggestions" text[],
	"metadata" jsonb,
	"last_analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "alt_text_quality_image_id_unique" UNIQUE("image_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"event_action" text NOT NULL,
	"event_label" text,
	"event_value" real,
	"page_url" text,
	"referrer" text,
	"user_agent" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"screen_resolution" text,
	"viewport" text,
	"properties" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"time_on_page" integer
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"api_name" text NOT NULL,
	"endpoint" text NOT NULL,
	"query_params" text,
	"status_code" integer NOT NULL,
	"success" boolean NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appliance_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"brand" text,
	"model" text,
	"description" text,
	"capabilities" text[],
	"size_or_capacity" text,
	"material" text,
	"is_common" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"search_terms" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"provider_email" varchar,
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp,
	"is_primary" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"original_content_id" varchar,
	"content_type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"user_id" varchar NOT NULL,
	"blocked_categories" text[],
	"toxicity_level" real,
	"metadata" jsonb,
	"auto_blocked" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'blocked' NOT NULL,
	"appeal_id" varchar,
	"restored_at" timestamp,
	"restored_by" varchar,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" varchar,
	"keywords" text[],
	"color" text DEFAULT '#3B82F6',
	"icon" text DEFAULT 'folder',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"category_id" varchar NOT NULL,
	"confidence_score" real DEFAULT 1,
	"is_manual" boolean DEFAULT false,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_embeddings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-ada-002' NOT NULL,
	"content_text" text NOT NULL,
	"metadata" jsonb,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"tag_id" varchar NOT NULL,
	"relevance_score" real DEFAULT 1,
	"is_manual" boolean DEFAULT false,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_context" (
	"conversation_id" varchar PRIMARY KEY NOT NULL,
	"context_summary" text,
	"key_facts" jsonb DEFAULT '[]'::jsonb,
	"last_summarized" timestamp DEFAULT now(),
	"message_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cooking_terms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"category" text NOT NULL,
	"short_definition" text NOT NULL,
	"long_definition" text NOT NULL,
	"example" text,
	"difficulty" text,
	"time_estimate" text,
	"tools" text[],
	"tips" text[],
	"related_terms" text[],
	"image_url" text,
	"video_url" text,
	"search_terms" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cooking_terms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"stripe_payment_intent_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"donor_email" text,
	"donor_name" text,
	"message" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donations_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "draft_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_type" text NOT NULL,
	"template_prompt" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "duplicate_pairs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id_1" varchar NOT NULL,
	"content_type_1" text NOT NULL,
	"content_id_2" varchar NOT NULL,
	"content_type_2" text NOT NULL,
	"similarity_score" real NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "excerpt_performance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"excerpt_id" varchar NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"engagements" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"bounces" integer DEFAULT 0,
	"time_on_page" real,
	"platform_metrics" jsonb,
	"ctr" real,
	"share_rate" real,
	"engagement_rate" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "excerpts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"original_content" text,
	"excerpt_text" text NOT NULL,
	"excerpt_type" varchar(20) DEFAULT 'social' NOT NULL,
	"target_platform" varchar(20) DEFAULT 'generic',
	"character_count" integer NOT NULL,
	"word_count" integer,
	"click_through_rate" real DEFAULT 0,
	"is_active" boolean DEFAULT false NOT NULL,
	"variant" varchar(10) DEFAULT 'A',
	"generation_params" jsonb,
	"social_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fdc_cache" (
	"id" varchar PRIMARY KEY NOT NULL,
	"fdc_id" text NOT NULL,
	"data_type" text,
	"description" text NOT NULL,
	"brand_owner" text,
	"brand_name" text,
	"ingredients" text,
	"serving_size" real,
	"serving_size_unit" text,
	"nutrients" jsonb,
	"full_data" jsonb,
	"cached_at" timestamp NOT NULL,
	"last_accessed" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_reviews" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"reviewer_id" varchar(50) NOT NULL,
	"activity_id" varchar(50),
	"decision" varchar(20) NOT NULL,
	"notes" text,
	"restrictions" jsonb,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fraud_scores" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"score" real NOT NULL,
	"factors" jsonb NOT NULL,
	"model_version" varchar(20) DEFAULT 'v1.0' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"original_message_id" text,
	"original_message" text,
	"draft_content" text NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"edited_content" text,
	"tone" text,
	"context_type" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "image_metadata" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"generated_alt" text,
	"title" text,
	"is_decorative" boolean DEFAULT false NOT NULL,
	"file_name" text,
	"mime_type" varchar(50),
	"file_size" integer,
	"dimensions" jsonb,
	"ai_model" varchar(50),
	"generated_at" timestamp,
	"confidence" real,
	"objects_detected" text[],
	"context" text,
	"language" varchar(10) DEFAULT 'en',
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "language_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"preferred_languages" text[] DEFAULT ARRAY['en']::text[] NOT NULL,
	"auto_translate" boolean DEFAULT true NOT NULL,
	"native_language" varchar(10) DEFAULT 'en',
	"show_original_text" boolean DEFAULT false NOT NULL,
	"translation_quality" varchar(20) DEFAULT 'balanced' NOT NULL,
	"excluded_content_types" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "language_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"recipe_id" varchar NOT NULL,
	"date" text NOT NULL,
	"meal_type" text NOT NULL,
	"servings" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"timestamp" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "moderation_appeals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"blocked_content_id" varchar,
	"user_id" varchar NOT NULL,
	"appeal_reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"appeal_type" varchar(50),
	"supporting_evidence" text,
	"original_action" varchar(20),
	"original_severity" varchar(20),
	"assigned_to" varchar,
	"review_started_at" timestamp,
	"decision" varchar(20),
	"decision_reason" text,
	"decided_by" varchar,
	"decided_at" timestamp,
	"action_taken" text,
	"user_notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"toxicity_scores" jsonb NOT NULL,
	"action_taken" varchar(20) NOT NULL,
	"model_used" varchar(50) NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"categories" text[],
	"severity" varchar(20) NOT NULL,
	"manual_review" boolean DEFAULT false NOT NULL,
	"reviewed_by" varchar,
	"review_notes" text,
	"override_reason" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"status" text DEFAULT 'sent' NOT NULL,
	"platform" text NOT NULL,
	"push_token_id" varchar,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"dismissed_at" timestamp,
	"dismissed_by" varchar
);
--> statement-breakpoint
CREATE TABLE "onboarding_inventory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"upc" text,
	"fdc_id" varchar,
	"description" text,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"storage" text NOT NULL,
	"expiration_days" integer NOT NULL,
	"category" text,
	"food_category" text,
	"nutrition" jsonb,
	"usda_data" jsonb,
	"brand_owner" text,
	"ingredients" text,
	"serving_size" text,
	"serving_size_unit" text,
	"image_url" text,
	"barcode_lookup_data" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"data_source" text,
	CONSTRAINT "onboarding_inventory_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"natural_query" text NOT NULL,
	"generated_sql" text,
	"result_count" integer DEFAULT 0,
	"execution_time" integer,
	"error" text,
	"query_type" varchar(20) DEFAULT 'SELECT',
	"tables_accessed" text[],
	"is_successful" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"is_saved" boolean DEFAULT false NOT NULL,
	"saved_name" varchar(255),
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "related_content_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" text NOT NULL,
	"related_items" jsonb NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"search_type" text DEFAULT 'semantic' NOT NULL,
	"user_id" varchar NOT NULL,
	"results_count" integer NOT NULL,
	"clicked_result_id" varchar,
	"clicked_result_type" text,
	"click_position" integer,
	"time_to_click" integer,
	"search_latency" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sentiment_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" text NOT NULL,
	"threshold" real NOT NULL,
	"current_value" real NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"severity" text NOT NULL,
	"affected_category" text,
	"message" text NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sentiment_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"user_id" varchar,
	"content_type" text,
	"content" text NOT NULL,
	"sentiment" text NOT NULL,
	"confidence" real NOT NULL,
	"sentiment_scores" jsonb,
	"emotions" jsonb,
	"topics" text[],
	"keywords" text[],
	"aspect_sentiments" jsonb,
	"model_version" text DEFAULT 'v1.0' NOT NULL,
	"metadata" jsonb,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"avg_sentiment" real NOT NULL,
	"total_items" integer NOT NULL,
	"alert_triggered" boolean DEFAULT false NOT NULL,
	"period_type" text NOT NULL,
	"percentage_change" real,
	"categories" jsonb,
	"pain_points" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_segments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_name" text NOT NULL,
	"period" text NOT NULL,
	"sentiment_score" real NOT NULL,
	"period_type" text NOT NULL,
	"sample_size" integer NOT NULL,
	"positive_count" integer NOT NULL,
	"negative_count" integer NOT NULL,
	"neutral_count" integer NOT NULL,
	"top_issues" jsonb,
	"top_praises" jsonb,
	"trend_direction" text,
	"comparison_to_previous" real,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_trends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"time_period" text NOT NULL,
	"period_type" text NOT NULL,
	"avg_sentiment" real NOT NULL,
	"total_analyzed" integer NOT NULL,
	"sentiment_counts" jsonb NOT NULL,
	"dominant_emotions" jsonb,
	"top_topics" text[],
	"content_types" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" varchar NOT NULL,
	"original_content" text,
	"summary_text" text NOT NULL,
	"summary_type" varchar(20) DEFAULT 'tldr' NOT NULL,
	"word_count" integer NOT NULL,
	"original_word_count" integer,
	"summary_length" integer DEFAULT 2,
	"key_points" text[],
	"metadata" jsonb,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_text" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suspicious_activities" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"details" jsonb NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"auto_blocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"translated_text" text NOT NULL,
	"original_text" text,
	"content_type" varchar(50),
	"is_verified" boolean DEFAULT false NOT NULL,
	"translator_id" varchar,
	"translation_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_appliances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"user_id" varchar NOT NULL,
	"appliance_library_id" varchar,
	"custom_brand" text,
	"custom_model" text,
	"custom_capabilities" text[],
	"custom_capacity" text,
	"custom_serving_size" text,
	"nickname" text,
	"purchase_date" text,
	"warranty_end_date" text,
	"notes" text,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_email" text,
	"type" text NOT NULL,
	"category" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"url" text,
	"user_agent" text,
	"app_version" text,
	"sentiment" text,
	"priority" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution" text,
	"upvotes" jsonb DEFAULT '[]'::jsonb,
	"responses" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"expiration_date" text,
	"storage_location_id" varchar NOT NULL,
	"food_category" text,
	"image_url" text,
	"barcode" text,
	"notes" text,
	"nutrition" text,
	"usda_data" jsonb,
	"barcode_data" jsonb,
	"serving_size" text,
	"serving_size_unit" text,
	"weight_in_grams" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_recipes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" text[] NOT NULL,
	"instructions" text[] NOT NULL,
	"used_ingredients" text[] DEFAULT '{}' NOT NULL,
	"missing_ingredients" text[],
	"prep_time" text,
	"cook_time" text,
	"total_time" text,
	"servings" integer DEFAULT 4 NOT NULL,
	"difficulty" text DEFAULT 'medium',
	"cuisine" text,
	"category" text,
	"dietary_info" jsonb,
	"image_url" text,
	"source" text,
	"ai_prompt" text,
	"rating" integer,
	"notes" text,
	"nutrition" jsonb,
	"tags" jsonb,
	"needed_equipment" jsonb,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"similarity_hash" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"user_id" varchar,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"page_views" integer DEFAULT 0 NOT NULL,
	"events" integer DEFAULT 0 NOT NULL,
	"entry_page" text,
	"exit_page" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"user_agent" text,
	"device_type" text,
	"browser" text,
	"os" text,
	"country" text,
	"region" text,
	"city" text,
	"bounced" boolean DEFAULT false NOT NULL,
	"goal_completions" jsonb,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "user_shopping" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ingredient" text NOT NULL,
	"quantity" text,
	"unit" text,
	"recipe_id" varchar,
	"is_checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"fdc_id" text
);
--> statement-breakpoint
CREATE TABLE "user_storage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'package' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"primary_provider" varchar,
	"primary_provider_id" varchar,
	"dietary_restrictions" text[],
	"allergens" text[],
	"favorite_categories" text[],
	"expiration_alert_days" integer DEFAULT 3 NOT NULL,
	"storage_areas_enabled" text[],
	"household_size" integer DEFAULT 2 NOT NULL,
	"cooking_skill_level" text DEFAULT 'beginner' NOT NULL,
	"preferred_units" text DEFAULT 'imperial' NOT NULL,
	"foods_to_avoid" text[],
	"has_completed_onboarding" boolean DEFAULT false NOT NULL,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	"notify_expiring_food" boolean DEFAULT true NOT NULL,
	"notify_recipe_suggestions" boolean DEFAULT false NOT NULL,
	"notify_meal_reminders" boolean DEFAULT true NOT NULL,
	"notification_time" text DEFAULT '09:00',
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_commands" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"transcript" text NOT NULL,
	"command_type" text,
	"action_taken" text,
	"success" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "web_vitals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"value" real NOT NULL,
	"delta" real NOT NULL,
	"metric_id" text NOT NULL,
	"rating" text NOT NULL,
	"navigation_type" text,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"document_id" text,
	"original_text" text NOT NULL,
	"improved_text" text,
	"improvements_applied" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "writing_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"suggestion_type" text NOT NULL,
	"original_snippet" text NOT NULL,
	"suggested_snippet" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alt_text_quality" ADD CONSTRAINT "alt_text_quality_image_id_image_metadata_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_metadata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alt_text_quality" ADD CONSTRAINT "alt_text_quality_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_content" ADD CONSTRAINT "blocked_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_content" ADD CONSTRAINT "blocked_content_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_embeddings" ADD CONSTRAINT "content_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_context" ADD CONSTRAINT "conversation_context_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD CONSTRAINT "duplicate_pairs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD CONSTRAINT "duplicate_pairs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ADD CONSTRAINT "excerpt_performance_excerpt_id_excerpts_id_fk" FOREIGN KEY ("excerpt_id") REFERENCES "public"."excerpts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excerpts" ADD CONSTRAINT "excerpts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_reviews" ADD CONSTRAINT "fraud_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_reviews" ADD CONSTRAINT "fraud_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_reviews" ADD CONSTRAINT "fraud_reviews_activity_id_suspicious_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."suspicious_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_scores" ADD CONSTRAINT "fraud_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD CONSTRAINT "generated_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD CONSTRAINT "image_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "language_preferences" ADD CONSTRAINT "language_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_recipe_id_user_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."user_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_blocked_content_id_blocked_content_id_fk" FOREIGN KEY ("blocked_content_id") REFERENCES "public"."blocked_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_push_token_id_push_tokens_id_fk" FOREIGN KEY ("push_token_id") REFERENCES "public"."push_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_content_cache" ADD CONSTRAINT "related_content_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_analysis" ADD CONSTRAINT "sentiment_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ADD CONSTRAINT "sentiment_trends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspicious_activities" ADD CONSTRAINT "suspicious_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_translator_id_users_id_fk" FOREIGN KEY ("translator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_appliances" ADD CONSTRAINT "user_appliances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_appliances" ADD CONSTRAINT "user_appliances_appliance_library_id_appliance_library_id_fk" FOREIGN KEY ("appliance_library_id") REFERENCES "public"."appliance_library"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recipes" ADD CONSTRAINT "user_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD CONSTRAINT "user_shopping_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD CONSTRAINT "user_shopping_recipe_id_user_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."user_recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_storage" ADD CONSTRAINT "user_storage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_vitals" ADD CONSTRAINT "web_vitals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD CONSTRAINT "writing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD CONSTRAINT "writing_suggestions_session_id_writing_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."writing_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_entity_id_idx" ON "activity_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "alt_text_quality_image_id_idx" ON "alt_text_quality" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "alt_text_quality_score_idx" ON "alt_text_quality" USING btree ("quality_score");--> statement-breakpoint
CREATE INDEX "alt_text_quality_wcag_idx" ON "alt_text_quality" USING btree ("wcag_level");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_events_event_category_idx" ON "analytics_events" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "api_usage_logs_user_id_idx" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_logs_api_name_idx" ON "api_usage_logs" USING btree ("api_name");--> statement-breakpoint
CREATE INDEX "api_usage_logs_timestamp_idx" ON "api_usage_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "api_usage_logs_success_idx" ON "api_usage_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "appliance_library_category_idx" ON "appliance_library" USING btree ("category");--> statement-breakpoint
CREATE INDEX "appliance_library_subcategory_idx" ON "appliance_library" USING btree ("subcategory");--> statement-breakpoint
CREATE INDEX "appliance_library_is_common_idx" ON "appliance_library" USING btree ("is_common");--> statement-breakpoint
CREATE INDEX "auth_providers_user_id_idx" ON "auth_providers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_providers_provider_id_idx" ON "auth_providers" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "blocked_content_user_id_idx" ON "blocked_content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blocked_content_status_idx" ON "blocked_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blocked_content_timestamp_idx" ON "blocked_content" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "content_categories_content_idx" ON "content_categories" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "content_categories_category_idx" ON "content_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_categories_user_idx" ON "content_categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_categories_unique_idx" ON "content_categories" USING btree ("content_id","content_type","category_id","user_id");--> statement-breakpoint
CREATE INDEX "content_embeddings_user_id_idx" ON "content_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_embeddings_content_idx" ON "content_embeddings" USING btree ("content_id","content_type","user_id");--> statement-breakpoint
CREATE INDEX "content_tags_content_idx" ON "content_tags" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "content_tags_tag_idx" ON "content_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "content_tags_user_idx" ON "content_tags" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_tags_unique_idx" ON "content_tags" USING btree ("content_id","content_type","tag_id","user_id");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "cooking_terms_term_idx" ON "cooking_terms" USING btree ("term");--> statement-breakpoint
CREATE INDEX "cooking_terms_category_idx" ON "cooking_terms" USING btree ("category");--> statement-breakpoint
CREATE INDEX "donations_user_id_idx" ON "donations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "donations_stripe_payment_intent_id_idx" ON "donations" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "donations_created_at_idx" ON "donations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "draft_templates_context_type_idx" ON "draft_templates" USING btree ("context_type");--> statement-breakpoint
CREATE INDEX "draft_templates_usage_count_idx" ON "draft_templates" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_user_idx" ON "duplicate_pairs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_status_idx" ON "duplicate_pairs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_score_idx" ON "duplicate_pairs" USING btree ("similarity_score");--> statement-breakpoint
CREATE INDEX "excerpt_performance_excerpt_id_idx" ON "excerpt_performance" USING btree ("excerpt_id");--> statement-breakpoint
CREATE INDEX "excerpt_performance_date_idx" ON "excerpt_performance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "excerpt_performance_unique_idx" ON "excerpt_performance" USING btree ("excerpt_id","date");--> statement-breakpoint
CREATE INDEX "excerpts_user_id_idx" ON "excerpts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "excerpts_content_id_idx" ON "excerpts" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "excerpts_active_idx" ON "excerpts" USING btree ("is_active","content_id");--> statement-breakpoint
CREATE INDEX "fdc_cache_description_idx" ON "fdc_cache" USING btree ("description");--> statement-breakpoint
CREATE INDEX "fdc_cache_brand_owner_idx" ON "fdc_cache" USING btree ("brand_owner");--> statement-breakpoint
CREATE INDEX "fraud_reviews_user_id_idx" ON "fraud_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fraud_reviews_reviewer_id_idx" ON "fraud_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "fraud_reviews_activity_id_idx" ON "fraud_reviews" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "fraud_reviews_decision_idx" ON "fraud_reviews" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "fraud_reviews_reviewed_at_idx" ON "fraud_reviews" USING btree ("reviewed_at");--> statement-breakpoint
CREATE INDEX "fraud_scores_user_id_idx" ON "fraud_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fraud_scores_timestamp_idx" ON "fraud_scores" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "fraud_scores_score_idx" ON "fraud_scores" USING btree ("score");--> statement-breakpoint
CREATE INDEX "generated_drafts_user_id_idx" ON "generated_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_drafts_selected_idx" ON "generated_drafts" USING btree ("selected");--> statement-breakpoint
CREATE INDEX "generated_drafts_original_message_id_idx" ON "generated_drafts" USING btree ("original_message_id");--> statement-breakpoint
CREATE INDEX "image_metadata_user_id_idx" ON "image_metadata" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "image_metadata_url_idx" ON "image_metadata" USING btree ("image_url");--> statement-breakpoint
CREATE INDEX "image_metadata_uploaded_at_idx" ON "image_metadata" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "language_preferences_user_id_idx" ON "language_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_plans_user_id_idx" ON "meal_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_plans_recipe_id_idx" ON "meal_plans" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "meal_plans_date_idx" ON "meal_plans" USING btree ("date");--> statement-breakpoint
CREATE INDEX "meal_plans_meal_type_idx" ON "meal_plans" USING btree ("meal_type");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "moderation_appeals_user_id_idx" ON "moderation_appeals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "moderation_appeals_content_id_idx" ON "moderation_appeals" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "moderation_appeals_status_idx" ON "moderation_appeals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_appeals_assigned_idx" ON "moderation_appeals" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "moderation_logs_user_id_idx" ON "moderation_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_content_id_idx" ON "moderation_logs" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_action_idx" ON "moderation_logs" USING btree ("action_taken");--> statement-breakpoint
CREATE INDEX "moderation_logs_severity_idx" ON "moderation_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_history_user_id_idx" ON "notification_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_history_type_idx" ON "notification_history" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_history_status_idx" ON "notification_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_history_sent_at_idx" ON "notification_history" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_display_name_idx" ON "onboarding_inventory" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_upc_idx" ON "onboarding_inventory" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_fdc_id_idx" ON "onboarding_inventory" USING btree ("fdc_id");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_category_idx" ON "onboarding_inventory" USING btree ("category");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_food_category_idx" ON "onboarding_inventory" USING btree ("food_category");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_user_token_idx" ON "push_tokens" USING btree ("user_id","token");--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "query_logs_user_idx" ON "query_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "query_logs_created_idx" ON "query_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "query_logs_is_saved_idx" ON "query_logs" USING btree ("is_saved");--> statement-breakpoint
CREATE INDEX "related_content_cache_content_idx" ON "related_content_cache" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "related_content_cache_user_idx" ON "related_content_cache" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "related_content_cache_expires_idx" ON "related_content_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "search_logs_user_id_idx" ON "search_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_logs_timestamp_idx" ON "search_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_status_idx" ON "sentiment_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_type_idx" ON "sentiment_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "sentiment_alerts_triggered_idx" ON "sentiment_alerts" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "sentiment_analysis_user_id_idx" ON "sentiment_analysis" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_analysis_content_id_idx" ON "sentiment_analysis" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "sentiment_analysis_sentiment_idx" ON "sentiment_analysis" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "sentiment_analysis_analyzed_at_idx" ON "sentiment_analysis" USING btree ("analyzed_at");--> statement-breakpoint
CREATE INDEX "sentiment_metrics_period_idx" ON "sentiment_metrics" USING btree ("period");--> statement-breakpoint
CREATE INDEX "sentiment_metrics_alert_idx" ON "sentiment_metrics" USING btree ("alert_triggered");--> statement-breakpoint
CREATE UNIQUE INDEX "sentiment_metrics_unique_idx" ON "sentiment_metrics" USING btree ("period","period_type");--> statement-breakpoint
CREATE INDEX "sentiment_segments_name_idx" ON "sentiment_segments" USING btree ("segment_name");--> statement-breakpoint
CREATE INDEX "sentiment_segments_period_idx" ON "sentiment_segments" USING btree ("period");--> statement-breakpoint
CREATE INDEX "sentiment_segments_score_idx" ON "sentiment_segments" USING btree ("sentiment_score");--> statement-breakpoint
CREATE UNIQUE INDEX "sentiment_segments_unique_idx" ON "sentiment_segments" USING btree ("segment_name","period","period_type");--> statement-breakpoint
CREATE INDEX "sentiment_trends_user_id_idx" ON "sentiment_trends" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_trends_period_idx" ON "sentiment_trends" USING btree ("time_period");--> statement-breakpoint
CREATE INDEX "sentiment_trends_type_idx" ON "sentiment_trends" USING btree ("period_type");--> statement-breakpoint
CREATE UNIQUE INDEX "sentiment_trends_unique_idx" ON "sentiment_trends" USING btree ("user_id","time_period","period_type");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "summaries_user_id_idx" ON "summaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "summaries_content_id_idx" ON "summaries" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "summaries_user_content_idx" ON "summaries" USING btree ("user_id","content_id");--> statement-breakpoint
CREATE INDEX "suspicious_activities_user_id_idx" ON "suspicious_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "suspicious_activities_type_idx" ON "suspicious_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "suspicious_activities_risk_idx" ON "suspicious_activities" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "suspicious_activities_status_idx" ON "suspicious_activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suspicious_activities_detected_idx" ON "suspicious_activities" USING btree ("detected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "translations_content_id_idx" ON "translations" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "translations_language_code_idx" ON "translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_unique_idx" ON "translations" USING btree ("content_id","language_code");--> statement-breakpoint
CREATE INDEX "user_appliances_user_id_idx" ON "user_appliances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_appliances_appliance_library_id_idx" ON "user_appliances" USING btree ("appliance_library_id");--> statement-breakpoint
CREATE INDEX "user_feedback_user_id_idx" ON "user_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_feedback_type_idx" ON "user_feedback" USING btree ("type");--> statement-breakpoint
CREATE INDEX "user_feedback_status_idx" ON "user_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_feedback_priority_idx" ON "user_feedback" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "user_feedback_created_at_idx" ON "user_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_inventory_user_id_idx" ON "user_inventory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_inventory_expiration_date_idx" ON "user_inventory" USING btree ("expiration_date");--> statement-breakpoint
CREATE INDEX "user_inventory_storage_location_idx" ON "user_inventory" USING btree ("storage_location_id");--> statement-breakpoint
CREATE INDEX "user_inventory_food_category_idx" ON "user_inventory" USING btree ("food_category");--> statement-breakpoint
CREATE INDEX "user_recipes_user_id_idx" ON "user_recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_recipes_is_favorite_idx" ON "user_recipes" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "user_recipes_created_at_idx" ON "user_recipes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_sessions_session_id_idx" ON "user_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_start_time_idx" ON "user_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "user_shopping_list_items_user_id_idx" ON "user_shopping" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_shopping_list_items_is_checked_idx" ON "user_shopping" USING btree ("is_checked");--> statement-breakpoint
CREATE INDEX "user_shopping_list_items_recipe_id_idx" ON "user_shopping" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "user_storage_user_id_idx" ON "user_storage" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_storage_user_name_idx" ON "user_storage" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "voice_commands_user_id_idx" ON "voice_commands" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "voice_commands_timestamp_idx" ON "voice_commands" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "voice_commands_success_idx" ON "voice_commands" USING btree ("success");--> statement-breakpoint
CREATE INDEX "web_vitals_user_id_idx" ON "web_vitals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "web_vitals_name_idx" ON "web_vitals" USING btree ("name");--> statement-breakpoint
CREATE INDEX "web_vitals_created_at_idx" ON "web_vitals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "web_vitals_rating_idx" ON "web_vitals" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "writing_sessions_user_id_idx" ON "writing_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "writing_sessions_document_id_idx" ON "writing_sessions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "writing_suggestions_session_id_idx" ON "writing_suggestions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "writing_suggestions_type_idx" ON "writing_suggestions" USING btree ("suggestion_type");--> statement-breakpoint
CREATE INDEX "writing_suggestions_accepted_idx" ON "writing_suggestions" USING btree ("accepted");