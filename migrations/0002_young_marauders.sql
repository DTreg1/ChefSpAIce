CREATE TABLE "agent_expertise" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"expertise_area" text NOT NULL,
	"skill_level" integer NOT NULL,
	"languages" jsonb,
	"certifications" jsonb,
	"max_concurrent_tickets" integer DEFAULT 10,
	"current_ticket_count" integer DEFAULT 0,
	"availability" text,
	"average_resolution_time" integer,
	"satisfaction_score" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routing_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" text NOT NULL,
	"rule_order" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb NOT NULL,
	"assign_to" varchar,
	"assign_to_team" text,
	"set_priority" text,
	"set_category" text,
	"add_tags" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_routing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"from_assignee" varchar,
	"to_assignee" varchar,
	"routing_reason" text,
	"rule_id" varchar,
	"notes" text,
	"routed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" varchar,
	"metadata" jsonb,
	"resolution_notes" text,
	"satisfaction_rating" integer,
	"time_to_resolution" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"closed_at" timestamp,
	CONSTRAINT "tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "face_detections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"image_id" varchar NOT NULL,
	"image_url" text NOT NULL,
	"faces_detected" integer DEFAULT 0 NOT NULL,
	"face_coordinates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"processed_image_url" text,
	"processing_type" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "image_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"settings" jsonb NOT NULL,
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "image_processing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"image_id" varchar,
	"operation" text NOT NULL,
	"params" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0,
	"result_url" text,
	"error" text,
	"metadata" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ocr_corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"ocr_result_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"original_text" text NOT NULL,
	"corrected_text" text NOT NULL,
	"context" text,
	"reason" text,
	"validated" boolean DEFAULT false,
	"validated_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ocr_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"image_id" varchar NOT NULL,
	"text" text NOT NULL,
	"confidence" real NOT NULL,
	"language" text,
	"structured_data" jsonb,
	"engine" text DEFAULT 'tesseract' NOT NULL,
	"processing_time" integer,
	"reviewed" boolean DEFAULT false,
	"corrected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sentiment_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"user_id" varchar,
	"content_type" text,
	"content" text NOT NULL,
	"sentiment" text NOT NULL,
	"confidence" real NOT NULL,
	"sentiment_data" jsonb,
	"emotion_scores" jsonb,
	"key_phrases" jsonb,
	"context_factors" jsonb,
	"topics" text[],
	"keywords" text[],
	"aspect_sentiments" jsonb,
	"processing_time" integer,
	"language" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transcript_edits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcription_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"original_segment" text NOT NULL,
	"edited_segment" text NOT NULL,
	"timestamp" real NOT NULL,
	"edit_type" text DEFAULT 'other' NOT NULL,
	"confidence" real DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"audio_url" text NOT NULL,
	"transcript" text NOT NULL,
	"duration" real NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extracted_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar,
	"source_type" varchar NOT NULL,
	"template_id" varchar,
	"input_text" text NOT NULL,
	"extracted_fields" jsonb NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"field_confidence" jsonb,
	"validation_status" varchar DEFAULT 'pending' NOT NULL,
	"validation_errors" jsonb,
	"corrections" jsonb,
	"metadata" jsonb,
	"extracted_at" timestamp DEFAULT now(),
	"validated_at" timestamp,
	"validated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "extraction_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"example_text" text,
	"system_prompt" text,
	"extraction_config" jsonb DEFAULT '{"model":"gpt-3.5-turbo","temperature":0.3,"maxRetries":2,"confidenceThreshold":0.85,"enableStructuredOutput":true}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fraud_detection_results" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"analysis_type" varchar(50) NOT NULL,
	"overall_risk_score" real NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"risk_factors" jsonb,
	"evidence_details" jsonb,
	"device_info" jsonb,
	"behavior_data" jsonb,
	"action_taken" varchar(50),
	"action_reason" text,
	"model_version" varchar(20) DEFAULT 'v1.0' NOT NULL,
	"processing_time" integer,
	"confidence" real NOT NULL,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"auto_blur_faces" boolean DEFAULT false NOT NULL,
	"face_recognition_enabled" boolean DEFAULT true NOT NULL,
	"blur_intensity" integer DEFAULT 5 NOT NULL,
	"excluded_faces" jsonb DEFAULT '[]'::jsonb,
	"privacy_mode" text DEFAULT 'balanced' NOT NULL,
	"consent_to_processing" boolean DEFAULT false NOT NULL,
	"data_retention_days" integer DEFAULT 30 NOT NULL,
	"notify_on_face_detection" boolean DEFAULT false NOT NULL,
	"allow_group_photo_tagging" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "privacy_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar NOT NULL,
	"price" real NOT NULL,
	"previous_price" real,
	"change_reason" varchar,
	"demand_level" real,
	"inventory_level" real,
	"competitor_price" real,
	"metadata" jsonb,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_performance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"price_point" real NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"conversion_rate" real,
	"revenue" real DEFAULT 0 NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"profit" real,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"product_name" varchar NOT NULL,
	"base_price" real NOT NULL,
	"min_price" real NOT NULL,
	"max_price" real NOT NULL,
	"factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "conversation_context" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sentiment_analysis" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "conversation_context" CASCADE;--> statement-breakpoint
DROP TABLE "conversations" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
DROP TABLE "sentiment_analysis" CASCADE;--> statement-breakpoint
ALTER TABLE "cohorts" DROP CONSTRAINT "cohorts_name_unique";--> statement-breakpoint
ALTER TABLE "language_preferences" DROP CONSTRAINT "language_preferences_user_id_unique";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_user_id_unique";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP CONSTRAINT "onboarding_inventory_display_name_unique";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP CONSTRAINT "prediction_accuracy_prediction_id_unique";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_session_id_unique";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP CONSTRAINT "alt_text_quality_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP CONSTRAINT "analytics_insights_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cohorts" DROP CONSTRAINT "cohorts_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "content_categories" DROP CONSTRAINT "content_categories_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "content_embeddings" DROP CONSTRAINT "content_embeddings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "content_tags" DROP CONSTRAINT "content_tags_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP CONSTRAINT "duplicate_pairs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "excerpts" DROP CONSTRAINT "excerpts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "insight_feedback" DROP CONSTRAINT "insight_feedback_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP CONSTRAINT "maintenance_history_prediction_id_maintenance_predictions_id_fk";
--> statement-breakpoint
ALTER TABLE "meeting_suggestions" DROP CONSTRAINT "meeting_suggestions_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_scores" DROP CONSTRAINT "notification_scores_notification_id_notification_history_id_fk";
--> statement-breakpoint
ALTER TABLE "query_logs" DROP CONSTRAINT "query_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "related_content_cache" DROP CONSTRAINT "related_content_cache_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "search_logs" DROP CONSTRAINT "search_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "translations" DROP CONSTRAINT "translations_translator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP CONSTRAINT "trend_alerts_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "ab_test_insights_winner_idx";--> statement-breakpoint
DROP INDEX "ab_test_insights_confidence_idx";--> statement-breakpoint
DROP INDEX "ab_test_results_period_idx";--> statement-breakpoint
DROP INDEX "ab_tests_dates_idx";--> statement-breakpoint
DROP INDEX "ab_tests_created_by_idx";--> statement-breakpoint
DROP INDEX "activity_logs_action_idx";--> statement-breakpoint
DROP INDEX "activity_logs_entity_entity_id_idx";--> statement-breakpoint
DROP INDEX "alt_text_quality_image_id_idx";--> statement-breakpoint
DROP INDEX "alt_text_quality_wcag_idx";--> statement-breakpoint
DROP INDEX "analytics_events_session_id_idx";--> statement-breakpoint
DROP INDEX "analytics_events_event_type_idx";--> statement-breakpoint
DROP INDEX "analytics_events_timestamp_idx";--> statement-breakpoint
DROP INDEX "analytics_insights_user_id_idx";--> statement-breakpoint
DROP INDEX "analytics_insights_importance_idx";--> statement-breakpoint
DROP INDEX "analytics_insights_created_idx";--> statement-breakpoint
DROP INDEX "api_usage_logs_success_idx";--> statement-breakpoint
DROP INDEX "appliance_library_category_idx";--> statement-breakpoint
DROP INDEX "appliance_library_subcategory_idx";--> statement-breakpoint
DROP INDEX "categories_name_idx";--> statement-breakpoint
DROP INDEX "cohort_insights_importance_idx";--> statement-breakpoint
DROP INDEX "cohort_insights_status_idx";--> statement-breakpoint
DROP INDEX "cohort_insights_category_idx";--> statement-breakpoint
DROP INDEX "cohort_metrics_period_date_idx";--> statement-breakpoint
DROP INDEX "cohort_metrics_type_idx";--> statement-breakpoint
DROP INDEX "cohort_metrics_unique_idx";--> statement-breakpoint
DROP INDEX "cohorts_name_idx";--> statement-breakpoint
DROP INDEX "cohorts_active_idx";--> statement-breakpoint
DROP INDEX "cohorts_created_by_idx";--> statement-breakpoint
DROP INDEX "cohorts_last_refreshed_idx";--> statement-breakpoint
DROP INDEX "completion_feedback_user_idx";--> statement-breakpoint
DROP INDEX "content_categories_category_idx";--> statement-breakpoint
DROP INDEX "content_categories_user_idx";--> statement-breakpoint
DROP INDEX "content_embeddings_user_id_idx";--> statement-breakpoint
DROP INDEX "content_tags_tag_idx";--> statement-breakpoint
DROP INDEX "content_tags_user_idx";--> statement-breakpoint
DROP INDEX "donations_stripe_payment_intent_id_idx";--> statement-breakpoint
DROP INDEX "draft_templates_context_type_idx";--> statement-breakpoint
DROP INDEX "draft_templates_usage_count_idx";--> statement-breakpoint
DROP INDEX "duplicate_pairs_user_idx";--> statement-breakpoint
DROP INDEX "duplicate_pairs_status_idx";--> statement-breakpoint
DROP INDEX "duplicate_pairs_score_idx";--> statement-breakpoint
DROP INDEX "excerpt_performance_date_idx";--> statement-breakpoint
DROP INDEX "excerpt_performance_unique_idx";--> statement-breakpoint
DROP INDEX "excerpts_user_id_idx";--> statement-breakpoint
DROP INDEX "excerpts_content_id_idx";--> statement-breakpoint
DROP INDEX "excerpts_active_idx";--> statement-breakpoint
DROP INDEX "fdc_cache_description_idx";--> statement-breakpoint
DROP INDEX "fdc_cache_brand_owner_idx";--> statement-breakpoint
DROP INDEX "fraud_reviews_activity_id_idx";--> statement-breakpoint
DROP INDEX "fraud_reviews_decision_idx";--> statement-breakpoint
DROP INDEX "generated_drafts_selected_idx";--> statement-breakpoint
DROP INDEX "generated_drafts_original_message_id_idx";--> statement-breakpoint
DROP INDEX "image_metadata_url_idx";--> statement-breakpoint
DROP INDEX "image_metadata_uploaded_at_idx";--> statement-breakpoint
DROP INDEX "insight_feedback_user_insight_idx";--> statement-breakpoint
DROP INDEX "maintenance_history_resolved_at_idx";--> statement-breakpoint
DROP INDEX "maintenance_history_prediction_id_idx";--> statement-breakpoint
DROP INDEX "maintenance_predictions_recommended_date_idx";--> statement-breakpoint
DROP INDEX "maintenance_predictions_status_idx";--> statement-breakpoint
DROP INDEX "maintenance_predictions_probability_idx";--> statement-breakpoint
DROP INDEX "maintenance_predictions_urgency_idx";--> statement-breakpoint
DROP INDEX "meal_plans_meal_type_idx";--> statement-breakpoint
DROP INDEX "meeting_suggestions_created_by_idx";--> statement-breakpoint
DROP INDEX "meeting_suggestions_status_idx";--> statement-breakpoint
DROP INDEX "moderation_appeals_content_id_idx";--> statement-breakpoint
DROP INDEX "moderation_appeals_assigned_idx";--> statement-breakpoint
DROP INDEX "notification_feedback_action_idx";--> statement-breakpoint
DROP INDEX "notification_feedback_action_at_idx";--> statement-breakpoint
DROP INDEX "notification_feedback_unique_idx";--> statement-breakpoint
DROP INDEX "notification_preferences_updated_idx";--> statement-breakpoint
DROP INDEX "notification_scores_notification_id_idx";--> statement-breakpoint
DROP INDEX "notification_scores_hold_until_idx";--> statement-breakpoint
DROP INDEX "notification_scores_relevance_idx";--> statement-breakpoint
DROP INDEX "onboarding_inventory_display_name_idx";--> statement-breakpoint
DROP INDEX "onboarding_inventory_upc_idx";--> statement-breakpoint
DROP INDEX "onboarding_inventory_fdc_id_idx";--> statement-breakpoint
DROP INDEX "onboarding_inventory_food_category_idx";--> statement-breakpoint
DROP INDEX "prediction_accuracy_score_idx";--> statement-breakpoint
DROP INDEX "prediction_accuracy_outcome_date_idx";--> statement-breakpoint
DROP INDEX "query_logs_user_idx";--> statement-breakpoint
DROP INDEX "query_logs_created_idx";--> statement-breakpoint
DROP INDEX "query_logs_is_saved_idx";--> statement-breakpoint
DROP INDEX "related_content_cache_user_idx";--> statement-breakpoint
DROP INDEX "save_patterns_analyzed_idx";--> statement-breakpoint
DROP INDEX "scheduling_patterns_type_idx";--> statement-breakpoint
DROP INDEX "sentiment_segments_score_idx";--> statement-breakpoint
DROP INDEX "sentiment_trends_type_idx";--> statement-breakpoint
DROP INDEX "sentiment_trends_unique_idx";--> statement-breakpoint
DROP INDEX "summaries_content_id_idx";--> statement-breakpoint
DROP INDEX "summaries_user_content_idx";--> statement-breakpoint
DROP INDEX "system_metrics_component_timestamp_idx";--> statement-breakpoint
DROP INDEX "system_metrics_anomaly_score_idx";--> statement-breakpoint
DROP INDEX "tags_name_idx";--> statement-breakpoint
DROP INDEX "translations_content_id_idx";--> statement-breakpoint
DROP INDEX "translations_language_code_idx";--> statement-breakpoint
DROP INDEX "translations_unique_idx";--> statement-breakpoint
DROP INDEX "trend_alerts_user_id_idx";--> statement-breakpoint
DROP INDEX "trend_alerts_type_idx";--> statement-breakpoint
DROP INDEX "trend_alerts_priority_idx";--> statement-breakpoint
DROP INDEX "trend_alerts_triggered_at_idx";--> statement-breakpoint
DROP INDEX "trend_alerts_active_idx";--> statement-breakpoint
DROP INDEX "trends_status_idx";--> statement-breakpoint
DROP INDEX "trends_type_idx";--> statement-breakpoint
DROP INDEX "trends_strength_idx";--> statement-breakpoint
DROP INDEX "trends_start_date_idx";--> statement-breakpoint
DROP INDEX "trends_peak_date_idx";--> statement-breakpoint
DROP INDEX "user_feedback_priority_idx";--> statement-breakpoint
DROP INDEX "user_form_history_unique_idx";--> statement-breakpoint
DROP INDEX "user_form_history_field_idx";--> statement-breakpoint
DROP INDEX "user_form_history_updated_idx";--> statement-breakpoint
DROP INDEX "user_predictions_type_idx";--> statement-breakpoint
DROP INDEX "user_predictions_probability_idx";--> statement-breakpoint
DROP INDEX "user_predictions_status_idx";--> statement-breakpoint
DROP INDEX "user_predictions_predicted_date_idx";--> statement-breakpoint
DROP INDEX "user_sessions_session_id_idx";--> statement-breakpoint
DROP INDEX "user_sessions_start_time_idx";--> statement-breakpoint
DROP INDEX "user_shopping_list_items_user_id_idx";--> statement-breakpoint
DROP INDEX "user_shopping_list_items_is_checked_idx";--> statement-breakpoint
DROP INDEX "user_shopping_list_items_recipe_id_idx";--> statement-breakpoint
DROP INDEX "validation_errors_user_field_idx";--> statement-breakpoint
DROP INDEX "validation_rules_active_priority_idx";--> statement-breakpoint
DROP INDEX "voice_commands_timestamp_idx";--> statement-breakpoint
DROP INDEX "voice_commands_success_idx";--> statement-breakpoint
DROP INDEX "web_vitals_name_idx";--> statement-breakpoint
DROP INDEX "web_vitals_created_at_idx";--> statement-breakpoint
DROP INDEX "web_vitals_rating_idx";--> statement-breakpoint
DROP INDEX "writing_sessions_document_id_idx";--> statement-breakpoint
DROP INDEX "writing_suggestions_type_idx";--> statement-breakpoint
DROP INDEX "writing_suggestions_accepted_idx";--> statement-breakpoint
DROP INDEX "content_categories_unique_idx";--> statement-breakpoint
DROP INDEX "content_embeddings_content_idx";--> statement-breakpoint
DROP INDEX "content_tags_unique_idx";--> statement-breakpoint
DROP INDEX "meeting_suggestions_meeting_id_idx";--> statement-breakpoint
DROP INDEX "related_content_cache_content_idx";--> statement-breakpoint
DROP INDEX "scheduling_preferences_user_id_idx";--> statement-breakpoint
DROP INDEX "sentiment_trends_period_idx";--> statement-breakpoint
DROP INDEX "tags_slug_idx";--> statement-breakpoint
DROP INDEX "validation_rules_field_type_idx";--> statement-breakpoint
ALTER TABLE "ab_test_insights" ALTER COLUMN "confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ALTER COLUMN "recommendation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ALTER COLUMN "end_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "action" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "ip_address" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "analytics_events" ALTER COLUMN "event_action" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_insights" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "analytics_insights" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ALTER COLUMN "status_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ALTER COLUMN "timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "parent_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cohort_insights" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ALTER COLUMN "user_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_categories" ALTER COLUMN "category_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "content_tags" ALTER COLUMN "tag_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "cooking_terms" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "cooking_terms" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cooking_terms" ALTER COLUMN "difficulty" SET DEFAULT 'beginner';--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_templates" ALTER COLUMN "usage_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ALTER COLUMN "excerpt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fdc_cache" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fdc_cache" ALTER COLUMN "cached_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "fdc_cache" ALTER COLUMN "cached_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fdc_cache" ALTER COLUMN "last_accessed" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "fdc_cache" ALTER COLUMN "last_accessed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_drafts" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "image_metadata" ALTER COLUMN "mime_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "image_metadata" ALTER COLUMN "mime_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "insight_feedback" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "insight_feedback" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "preferred_languages" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "preferred_languages" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "preferred_languages" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "auto_translate" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "translation_quality" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "translation_quality" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "language_preferences" ALTER COLUMN "translation_quality" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_plans" ALTER COLUMN "recipe_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_feedback" ALTER COLUMN "notification_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_scores" ALTER COLUMN "relevance_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notification_scores" ALTER COLUMN "relevance_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_scores" ALTER COLUMN "urgency_level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notification_scores" ALTER COLUMN "urgency_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ALTER COLUMN "actual_outcome" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ALTER COLUMN "actual_outcome" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ALTER COLUMN "accuracy_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "query_logs" ALTER COLUMN "execution_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "query_logs" ALTER COLUMN "query_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "query_logs" ALTER COLUMN "query_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "query_logs" ALTER COLUMN "query_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "query_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_patterns" ALTER COLUMN "pattern_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_preferences" ALTER COLUMN "meeting_preferences" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "search_logs" ALTER COLUMN "search_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "search_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "search_logs" ALTER COLUMN "timestamp" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "original_content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "summary_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "summary_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "summary_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "key_points" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "translations" ALTER COLUMN "original_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_alerts" ALTER COLUMN "trend_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_alerts" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ALTER COLUMN "sentiment" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "user_feedback" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "user_feedback" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_predictions" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_shopping" ALTER COLUMN "quantity" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_shopping" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_shopping" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "validation_rules" ALTER COLUMN "suggestions" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "validation_rules" ALTER COLUMN "priority" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "voice_commands" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "web_vitals" ALTER COLUMN "session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "web_vitals" ALTER COLUMN "rating" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_sessions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_sessions" ALTER COLUMN "document_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ALTER COLUMN "session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "variant" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "sample_size" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "conversion_rate" real NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "average_value" real;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "standard_deviation" real;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "is_significant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD COLUMN "calculated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD COLUMN "exposed_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD COLUMN "converted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD COLUMN "converted_at" timestamp;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD COLUMN "conversion_value" real;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "test_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "hypothesis" text;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "configuration" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "target_sample_size" integer;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD COLUMN "current_sample_size" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "activity_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "resource_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "resource_id" varchar;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "success" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "alt_text_quality" ADD COLUMN "wcag_compliance" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "alt_text_quality" ADD COLUMN "reviewed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "alt_text_quality" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "event_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "insight_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "severity" text;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "metrics" jsonb;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "recommendations" jsonb;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "is_actionable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "method" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "request_size" integer;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "response_size" integer;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "response_time" integer;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "cost" real;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "appliance_library" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "appliance_library" ADD COLUMN "capacity" text;--> statement-breakpoint
ALTER TABLE "appliance_library" ADD COLUMN "serving_size" text;--> statement-breakpoint
ALTER TABLE "appliance_library" ADD COLUMN "alternatives" text[];--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD COLUMN "insight_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD COLUMN "impact" text;--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD COLUMN "recommendations" jsonb;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ADD COLUMN "metric_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ADD COLUMN "previous_value" real;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ADD COLUMN "change_percent" real;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "cohort_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "criteria" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "refresh_interval" text;--> statement-breakpoint
ALTER TABLE "content_categories" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content_embeddings" ADD COLUMN "embedding_type" text;--> statement-breakpoint
ALTER TABLE "cooking_terms" ADD COLUMN "definition" text NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "receipt_email" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "recurring_interval" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "template_content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "variables" jsonb;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "tone" text;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "language" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD COLUMN "content_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD COLUMN "similarity" real NOT NULL;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD COLUMN "is_confirmed" boolean;--> statement-breakpoint
ALTER TABLE "duplicate_pairs" ADD COLUMN "is_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ADD COLUMN "usage_context" text;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ADD COLUMN "engagement_score" real;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ADD COLUMN "click_through" boolean;--> statement-breakpoint
ALTER TABLE "excerpt_performance" ADD COLUMN "time_viewed" integer;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "summary_id" varchar;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "excerpt" text NOT NULL;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "importance" real;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "excerpts" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "template_id" varchar;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "prompt" text NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "generated_content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "generation_time" integer;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "filename" text NOT NULL;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "size" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "auto_generated_alt" text;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "detected_text" text;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "image_metadata" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD COLUMN "is_useful" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD COLUMN "action_taken" text;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "language_preferences" ADD COLUMN "primary_language" text NOT NULL;--> statement-breakpoint
ALTER TABLE "language_preferences" ADD COLUMN "preserve_formatting" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "maintenance_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "action" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "performed_by" varchar;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "downtime" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "started_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "prediction_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "risk" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "predicted_date" timestamp;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "confidence" real NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "recommendation" text NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "maintenance_predictions" ADD COLUMN "is_addressed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "recipe_name" text;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "ingredients_used" text[];--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "meeting_suggestions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "meeting_suggestions" ADD COLUMN "selected_by" varchar;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD COLUMN "feedback_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD COLUMN "suggested_improvement" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "notification_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "frequency" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "quiet_hours_start" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "quiet_hours_end" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "min_importance" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "channels" jsonb DEFAULT '["push"]'::jsonb;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "notification_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "score" real NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "factors" jsonb;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "calculated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "notification_scores" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "storage_location" text DEFAULT 'pantry' NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "common_brand" text;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "default_quantity" text DEFAULT '1';--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "default_unit" text DEFAULT 'item';--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "is_popular" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_inventory" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ADD COLUMN "is_correct" boolean;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ADD COLUMN "evaluated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "table_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "rows_affected" integer;--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "query_hash" text;--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "endpoint" text;--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "timestamp" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "related_content_cache" ADD COLUMN "related_content" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "save_patterns" ADD COLUMN "last_updated" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "save_patterns" ADD COLUMN "samples_collected" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "scheduling_patterns" ADD COLUMN "accuracy_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "scheduling_patterns" ADD COLUMN "last_analyzed" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "search_logs" ADD COLUMN "search_query" text NOT NULL;--> statement-breakpoint
ALTER TABLE "search_logs" ADD COLUMN "clicked_result_rank" integer;--> statement-breakpoint
ALTER TABLE "search_logs" ADD COLUMN "search_duration" integer;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ADD COLUMN "change_from_previous" real;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ADD COLUMN "volatility" real;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ADD COLUMN "predicted_next" real;--> statement-breakpoint
ALTER TABLE "sentiment_trends" ADD COLUMN "anomaly_detected" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "source_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "source_id" varchar;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "word_count_original" integer;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "word_count_summary" integer;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "compression_ratio" real;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "language" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD COLUMN "metric_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "source_language" text NOT NULL;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "target_language" text NOT NULL;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "alternative_translations" jsonb;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD COLUMN "alert_level" text NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD COLUMN "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD COLUMN "is_acknowledged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD COLUMN "acknowledged_by" varchar;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "metric" text NOT NULL;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "current_value" real NOT NULL;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "previous_value" real NOT NULL;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "change_percent" real NOT NULL;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "time_period" text NOT NULL;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "significance" real;--> statement-breakpoint
ALTER TABLE "trends" ADD COLUMN "detected_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "page_url" text;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "response" text;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "responded_by" varchar;--> statement-breakpoint
ALTER TABLE "user_form_history" ADD COLUMN "last_updated" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_predictions" ADD COLUMN "prediction" jsonb;--> statement-breakpoint
ALTER TABLE "user_predictions" ADD COLUMN "confidence" real NOT NULL;--> statement-breakpoint
ALTER TABLE "user_predictions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "user_predictions" ADD COLUMN "valid_until" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "session_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "started_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "interactions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "device_info" jsonb;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "is_purchased" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "recipe_title" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "added_from" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "purchased_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "purchased_quantity" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "purchased_unit" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "store_name" text;--> statement-breakpoint
ALTER TABLE "user_shopping" ADD COLUMN "price" real;--> statement-breakpoint
ALTER TABLE "validation_rules" ADD COLUMN "example_values" text[];--> statement-breakpoint
ALTER TABLE "validation_rules" ADD COLUMN "performance_metrics" jsonb;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "audio_url" text;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "transcription" text NOT NULL;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "intent" text;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "action" text;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "processing_time" integer;--> statement-breakpoint
ALTER TABLE "voice_commands" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "web_vitals" ADD COLUMN "metric" text NOT NULL;--> statement-breakpoint
ALTER TABLE "web_vitals" ADD COLUMN "page" text NOT NULL;--> statement-breakpoint
ALTER TABLE "web_vitals" ADD COLUMN "timestamp" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "session_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "start_content" text;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "end_content" text;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "suggestions_accepted" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "suggestions_rejected" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "started_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD COLUMN "original_text" text NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD COLUMN "suggested_text" text NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD COLUMN "position" jsonb;--> statement-breakpoint
ALTER TABLE "writing_suggestions" ADD COLUMN "is_accepted" boolean;--> statement-breakpoint
ALTER TABLE "ticket_routing" ADD CONSTRAINT "ticket_routing_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_routing" ADD CONSTRAINT "ticket_routing_rule_id_routing_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."routing_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_detections" ADD CONSTRAINT "face_detections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_presets" ADD CONSTRAINT "image_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_processing" ADD CONSTRAINT "image_processing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_processing" ADD CONSTRAINT "image_processing_image_id_image_metadata_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_metadata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_corrections" ADD CONSTRAINT "ocr_corrections_ocr_result_id_ocr_results_id_fk" FOREIGN KEY ("ocr_result_id") REFERENCES "public"."ocr_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_corrections" ADD CONSTRAINT "ocr_corrections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_image_id_image_metadata_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image_metadata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_results" ADD CONSTRAINT "sentiment_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_edits" ADD CONSTRAINT "transcript_edits_transcription_id_transcriptions_id_fk" FOREIGN KEY ("transcription_id") REFERENCES "public"."transcriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_edits" ADD CONSTRAINT "transcript_edits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_template_id_extraction_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."extraction_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_detection_results" ADD CONSTRAINT "fraud_detection_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_expertise_agent_id_idx" ON "agent_expertise" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_expertise_expertise_area_idx" ON "agent_expertise" USING btree ("expertise_area");--> statement-breakpoint
CREATE INDEX "agent_expertise_availability_idx" ON "agent_expertise" USING btree ("availability");--> statement-breakpoint
CREATE INDEX "routing_rules_rule_order_idx" ON "routing_rules" USING btree ("rule_order");--> statement-breakpoint
CREATE INDEX "routing_rules_is_active_idx" ON "routing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ticket_routing_ticket_id_idx" ON "ticket_routing" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_routing_routed_at_idx" ON "ticket_routing" USING btree ("routed_at");--> statement-breakpoint
CREATE INDEX "tickets_user_id_idx" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_assigned_to_idx" ON "tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "face_detections_user_id_idx" ON "face_detections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "face_detections_image_id_idx" ON "face_detections" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "face_detections_created_at_idx" ON "face_detections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "image_presets_user_id_idx" ON "image_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "image_presets_is_public_idx" ON "image_presets" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "image_processing_user_id_idx" ON "image_processing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "image_processing_status_idx" ON "image_processing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "image_processing_priority_idx" ON "image_processing" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ocr_corrections_ocr_result_id_idx" ON "ocr_corrections" USING btree ("ocr_result_id");--> statement-breakpoint
CREATE INDEX "ocr_corrections_user_id_idx" ON "ocr_corrections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ocr_results_user_id_idx" ON "ocr_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ocr_results_image_id_idx" ON "ocr_results" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "ocr_results_confidence_idx" ON "ocr_results" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "sentiment_results_content_id_idx" ON "sentiment_results" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "sentiment_results_user_id_idx" ON "sentiment_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_results_sentiment_idx" ON "sentiment_results" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "sentiment_results_created_at_idx" ON "sentiment_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transcript_edits_transcription_id_idx" ON "transcript_edits" USING btree ("transcription_id");--> statement-breakpoint
CREATE INDEX "transcript_edits_user_id_idx" ON "transcript_edits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transcript_edits_created_at_idx" ON "transcript_edits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transcriptions_user_id_idx" ON "transcriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transcriptions_status_idx" ON "transcriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transcriptions_created_at_idx" ON "transcriptions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "extracted_data_source_id_idx" ON "extracted_data" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "extracted_data_template_id_idx" ON "extracted_data" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "extracted_data_validation_status_idx" ON "extracted_data" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "extracted_data_extracted_at_idx" ON "extracted_data" USING btree ("extracted_at");--> statement-breakpoint
CREATE INDEX "extraction_templates_name_idx" ON "extraction_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "extraction_templates_is_active_idx" ON "extraction_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "extraction_templates_created_by_idx" ON "extraction_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "fraud_detection_results_user_id_idx" ON "fraud_detection_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fraud_detection_results_type_idx" ON "fraud_detection_results" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "fraud_detection_results_risk_idx" ON "fraud_detection_results" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "fraud_detection_results_analyzed_idx" ON "fraud_detection_results" USING btree ("analyzed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_settings_user_id_idx" ON "privacy_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_history_product_id_idx" ON "price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_history_changed_at_idx" ON "price_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "pricing_performance_product_id_idx" ON "pricing_performance" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pricing_performance_period_idx" ON "pricing_performance" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "pricing_rules_product_id_idx" ON "pricing_rules" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_is_active_idx" ON "pricing_rules" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_templates" ADD CONSTRAINT "draft_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excerpts" ADD CONSTRAINT "excerpts_summary_id_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."summaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_drafts" ADD CONSTRAINT "generated_drafts_template_id_draft_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."draft_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD CONSTRAINT "insight_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_suggestions" ADD CONSTRAINT "meeting_suggestions_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ab_test_insights_calculated_at_idx" ON "ab_test_insights" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "ab_test_results_user_id_idx" ON "ab_test_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ab_tests_start_date_idx" ON "ab_tests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "activity_logs_activity_type_idx" ON "activity_logs" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "activity_logs_resource_type_idx" ON "activity_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "alt_text_quality_reviewed_idx" ON "alt_text_quality" USING btree ("reviewed");--> statement-breakpoint
CREATE INDEX "analytics_events_event_name_idx" ON "analytics_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_insights_insight_type_idx" ON "analytics_insights" USING btree ("insight_type");--> statement-breakpoint
CREATE INDEX "analytics_insights_category_idx" ON "analytics_insights" USING btree ("category");--> statement-breakpoint
CREATE INDEX "analytics_insights_created_at_idx" ON "analytics_insights" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "appliance_library_type_idx" ON "appliance_library" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "appliance_library_brand_model_idx" ON "appliance_library" USING btree ("brand","model");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cohort_insights_insight_type_idx" ON "cohort_insights" USING btree ("insight_type");--> statement-breakpoint
CREATE INDEX "cohort_metrics_metric_date_idx" ON "cohort_metrics" USING btree ("metric_date");--> statement-breakpoint
CREATE INDEX "cohorts_is_active_idx" ON "cohorts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cohorts_created_at_idx" ON "cohorts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "completion_feedback_user_id_idx" ON "completion_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_categories_category_id_idx" ON "content_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_embeddings_type_idx" ON "content_embeddings" USING btree ("embedding_type");--> statement-breakpoint
CREATE INDEX "content_tags_tag_id_idx" ON "content_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "cooking_terms_difficulty_idx" ON "cooking_terms" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "donations_stripe_payment_intent_idx" ON "donations" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "draft_templates_category_idx" ON "draft_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "draft_templates_is_public_idx" ON "draft_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_content1_idx" ON "duplicate_pairs" USING btree ("content_id_1");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_content2_idx" ON "duplicate_pairs" USING btree ("content_id_2");--> statement-breakpoint
CREATE INDEX "duplicate_pairs_similarity_idx" ON "duplicate_pairs" USING btree ("similarity");--> statement-breakpoint
CREATE INDEX "excerpt_performance_created_at_idx" ON "excerpt_performance" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "excerpts_summary_id_idx" ON "excerpts" USING btree ("summary_id");--> statement-breakpoint
CREATE INDEX "excerpts_category_idx" ON "excerpts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fdc_cache_fdc_id_idx" ON "fdc_cache" USING btree ("fdc_id");--> statement-breakpoint
CREATE INDEX "fdc_cache_cached_at_idx" ON "fdc_cache" USING btree ("cached_at");--> statement-breakpoint
CREATE INDEX "generated_drafts_template_id_idx" ON "generated_drafts" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "generated_drafts_created_at_idx" ON "generated_drafts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "image_metadata_category_idx" ON "image_metadata" USING btree ("category");--> statement-breakpoint
CREATE INDEX "image_metadata_created_at_idx" ON "image_metadata" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "insight_feedback_user_id_idx" ON "insight_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "maintenance_history_started_at_idx" ON "maintenance_history" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_risk_idx" ON "maintenance_predictions" USING btree ("risk");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_created_at_idx" ON "maintenance_predictions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_plans_unique_meal" ON "meal_plans" USING btree ("user_id","date","meal_type");--> statement-breakpoint
CREATE INDEX "meeting_suggestions_created_at_idx" ON "meeting_suggestions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "moderation_appeals_created_at_idx" ON "moderation_appeals" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_feedback_user_notification_idx" ON "notification_feedback" USING btree ("user_id","notification_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_type_idx" ON "notification_preferences" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "notification_scores_user_type_idx" ON "notification_scores" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "notification_scores_expires_at_idx" ON "notification_scores" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "onboarding_inventory_is_popular_idx" ON "onboarding_inventory" USING btree ("is_popular");--> statement-breakpoint
CREATE INDEX "prediction_accuracy_evaluated_at_idx" ON "prediction_accuracy" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "query_logs_table_name_idx" ON "query_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "query_logs_execution_time_idx" ON "query_logs" USING btree ("execution_time");--> statement-breakpoint
CREATE INDEX "query_logs_timestamp_idx" ON "query_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "scheduling_patterns_pattern_type_idx" ON "scheduling_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "search_logs_search_type_idx" ON "search_logs" USING btree ("search_type");--> statement-breakpoint
CREATE INDEX "sentiment_trends_created_at_idx" ON "sentiment_trends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "summaries_source_type_idx" ON "summaries" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "summaries_created_at_idx" ON "summaries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_metrics_metric_type_idx" ON "system_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "tags_usage_count_idx" ON "tags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "translations_user_id_idx" ON "translations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "translations_source_language_idx" ON "translations" USING btree ("source_language");--> statement-breakpoint
CREATE INDEX "translations_target_language_idx" ON "translations" USING btree ("target_language");--> statement-breakpoint
CREATE INDEX "translations_created_at_idx" ON "translations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trend_alerts_alert_level_idx" ON "trend_alerts" USING btree ("alert_level");--> statement-breakpoint
CREATE INDEX "trend_alerts_created_at_idx" ON "trend_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trends_trend_type_idx" ON "trends" USING btree ("trend_type");--> statement-breakpoint
CREATE INDEX "trends_metric_idx" ON "trends" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "trends_detected_at_idx" ON "trends" USING btree ("detected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_form_history_user_field_idx" ON "user_form_history" USING btree ("user_id","field_name");--> statement-breakpoint
CREATE INDEX "user_predictions_prediction_type_idx" ON "user_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "user_predictions_valid_until_idx" ON "user_predictions" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "user_sessions_started_at_idx" ON "user_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "user_shopping_user_id_idx" ON "user_shopping" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_shopping_is_purchased_idx" ON "user_shopping" USING btree ("is_purchased");--> statement-breakpoint
CREATE INDEX "user_shopping_created_at_idx" ON "user_shopping" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "validation_errors_user_id_idx" ON "validation_errors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "validation_rules_active_idx" ON "validation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "voice_commands_intent_idx" ON "voice_commands" USING btree ("intent");--> statement-breakpoint
CREATE INDEX "voice_commands_created_at_idx" ON "voice_commands" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "web_vitals_metric_idx" ON "web_vitals" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "web_vitals_timestamp_idx" ON "web_vitals" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "writing_sessions_started_at_idx" ON "writing_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "writing_suggestions_suggestion_type_idx" ON "writing_suggestions" USING btree ("suggestion_type");--> statement-breakpoint
CREATE UNIQUE INDEX "content_categories_unique_idx" ON "content_categories" USING btree ("content_id","category_id");--> statement-breakpoint
CREATE INDEX "content_embeddings_content_idx" ON "content_embeddings" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE UNIQUE INDEX "content_tags_unique_idx" ON "content_tags" USING btree ("content_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_suggestions_meeting_id_idx" ON "meeting_suggestions" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "related_content_cache_content_idx" ON "related_content_cache" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_preferences_user_id_idx" ON "scheduling_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_trends_period_idx" ON "sentiment_trends" USING btree ("time_period","period_type");--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "validation_rules_field_type_idx" ON "validation_rules" USING btree ("field_type");--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "winner";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "lift_percentage";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "explanation";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "insights";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "statistical_analysis";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "generated_by";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "ab_test_insights" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "conversions";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "visitors";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "revenue";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "engagement_score";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "bounce_rate";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "avg_session_duration";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "sample_size";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "period_start";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "period_end";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "ab_test_results" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "variant_a";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "variant_b";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "target_audience";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "success_metric";--> statement-breakpoint
ALTER TABLE "ab_tests" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "entity";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "entity_id";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "wcag_level";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "has_color_description";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "has_text_description";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "user_feedback";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "manually_reviewed";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "review_notes";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "alt_text_quality" DROP COLUMN "last_analyzed_at";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "event_type";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "page_url";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "referrer";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "user_agent";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "device_type";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "browser";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "os";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "screen_resolution";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "viewport";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "properties";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "timestamp";--> statement-breakpoint
ALTER TABLE "analytics_events" DROP COLUMN "time_on_page";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "metric_name";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "insight_text";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "importance";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "period";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "metric_data";--> statement-breakpoint
ALTER TABLE "analytics_insights" DROP COLUMN "ai_context";--> statement-breakpoint
ALTER TABLE "api_usage_logs" DROP COLUMN "query_params";--> statement-breakpoint
ALTER TABLE "api_usage_logs" DROP COLUMN "success";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "subcategory";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "size_or_capacity";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "material";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "search_terms";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "appliance_library" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "keywords";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "importance";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "action_recommended";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "confidence_score";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "supporting_data";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "related_cohorts";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "generated_by";--> statement-breakpoint
ALTER TABLE "cohort_insights" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "cohort_metrics" DROP COLUMN "period";--> statement-breakpoint
ALTER TABLE "cohort_metrics" DROP COLUMN "period_date";--> statement-breakpoint
ALTER TABLE "cohort_metrics" DROP COLUMN "metric_type";--> statement-breakpoint
ALTER TABLE "cohort_metrics" DROP COLUMN "segment_data";--> statement-breakpoint
ALTER TABLE "cohort_metrics" DROP COLUMN "comparison_data";--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN "definition";--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN "refresh_frequency";--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "content_categories" DROP COLUMN "confidence_score";--> statement-breakpoint
ALTER TABLE "content_categories" DROP COLUMN "is_manual";--> statement-breakpoint
ALTER TABLE "content_categories" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "content_embeddings" DROP COLUMN "embedding_model";--> statement-breakpoint
ALTER TABLE "content_embeddings" DROP COLUMN "content_text";--> statement-breakpoint
ALTER TABLE "content_embeddings" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "content_tags" DROP COLUMN "relevance_score";--> statement-breakpoint
ALTER TABLE "content_tags" DROP COLUMN "is_manual";--> statement-breakpoint
ALTER TABLE "content_tags" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "short_definition";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "long_definition";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "time_estimate";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "tools";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "search_terms";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "cooking_terms" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "donations" DROP COLUMN "donor_email";--> statement-breakpoint
ALTER TABLE "donations" DROP COLUMN "donor_name";--> statement-breakpoint
ALTER TABLE "donations" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "draft_templates" DROP COLUMN "context_type";--> statement-breakpoint
ALTER TABLE "draft_templates" DROP COLUMN "template_prompt";--> statement-breakpoint
ALTER TABLE "draft_templates" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP COLUMN "content_type_1";--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP COLUMN "content_type_2";--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP COLUMN "similarity_score";--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "duplicate_pairs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "views";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "clicks";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "shares";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "engagements";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "conversions";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "bounces";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "time_on_page";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "platform_metrics";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "ctr";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "share_rate";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "engagement_rate";--> statement-breakpoint
ALTER TABLE "excerpt_performance" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "content_id";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "original_content";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "excerpt_text";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "excerpt_type";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "target_platform";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "character_count";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "word_count";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "click_through_rate";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "variant";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "generation_params";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "social_metadata";--> statement-breakpoint
ALTER TABLE "excerpts" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "original_message_id";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "original_message";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "draft_content";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "selected";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "edited";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "tone";--> statement-breakpoint
ALTER TABLE "generated_drafts" DROP COLUMN "context_type";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "generated_alt";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "is_decorative";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "dimensions";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "ai_model";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "generated_at";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "confidence";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "objects_detected";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "context";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "language";--> statement-breakpoint
ALTER TABLE "image_metadata" DROP COLUMN "uploaded_at";--> statement-breakpoint
ALTER TABLE "insight_feedback" DROP COLUMN "helpful_score";--> statement-breakpoint
ALTER TABLE "insight_feedback" DROP COLUMN "comments";--> statement-breakpoint
ALTER TABLE "insight_feedback" DROP COLUMN "was_actionable";--> statement-breakpoint
ALTER TABLE "insight_feedback" DROP COLUMN "result_outcome";--> statement-breakpoint
ALTER TABLE "language_preferences" DROP COLUMN "native_language";--> statement-breakpoint
ALTER TABLE "language_preferences" DROP COLUMN "show_original_text";--> statement-breakpoint
ALTER TABLE "language_preferences" DROP COLUMN "excluded_content_types";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "issue";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "predicted_issue";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "prediction_id";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "resolved_at";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "downtime_minutes";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "performed_actions";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "outcome";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "performance_metrics";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "cost";--> statement-breakpoint
ALTER TABLE "maintenance_history" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "predicted_issue";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "probability";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "recommended_date";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "urgency_level";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "estimated_downtime";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "preventive_actions";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "model_version";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "maintenance_predictions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "meeting_suggestions" DROP COLUMN "optimization_factors";--> statement-breakpoint
ALTER TABLE "meeting_suggestions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "meeting_suggestions" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "meeting_suggestions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "action";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "action_at";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "engagement_time";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "followup_action";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "sentiment";--> statement-breakpoint
ALTER TABLE "notification_feedback" DROP COLUMN "device_info";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "notification_types";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "quiet_hours";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "frequency_limit";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "enable_smart_timing";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "enable_relevance_scoring";--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "preferredChannels";--> statement-breakpoint
ALTER TABLE "notification_scores" DROP COLUMN "notification_id";--> statement-breakpoint
ALTER TABLE "notification_scores" DROP COLUMN "optimal_time";--> statement-breakpoint
ALTER TABLE "notification_scores" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "upc";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "fdc_id";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "unit";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "storage";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "expiration_days";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "food_category";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "nutrition";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "brand_owner";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "ingredients";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "serving_size";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "serving_size_unit";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "barcode_lookup_data";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "last_updated";--> statement-breakpoint
ALTER TABLE "onboarding_inventory" DROP COLUMN "data_source";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP COLUMN "outcome_date";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP COLUMN "intervention_impact";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP COLUMN "feedback_notes";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP COLUMN "model_feedback";--> statement-breakpoint
ALTER TABLE "prediction_accuracy" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "natural_query";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "generated_sql";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "result_count";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "error";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "tables_accessed";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "is_successful";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "is_saved";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "saved_name";--> statement-breakpoint
ALTER TABLE "query_logs" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "related_content_cache" DROP COLUMN "related_items";--> statement-breakpoint
ALTER TABLE "related_content_cache" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "save_patterns" DROP COLUMN "last_analyzed";--> statement-breakpoint
ALTER TABLE "save_patterns" DROP COLUMN "total_sessions";--> statement-breakpoint
ALTER TABLE "save_patterns" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "save_patterns" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "scheduling_patterns" DROP COLUMN "confidence";--> statement-breakpoint
ALTER TABLE "scheduling_patterns" DROP COLUMN "last_occurrence";--> statement-breakpoint
ALTER TABLE "search_logs" DROP COLUMN "query";--> statement-breakpoint
ALTER TABLE "search_logs" DROP COLUMN "clicked_result_type";--> statement-breakpoint
ALTER TABLE "search_logs" DROP COLUMN "click_position";--> statement-breakpoint
ALTER TABLE "search_logs" DROP COLUMN "time_to_click";--> statement-breakpoint
ALTER TABLE "search_logs" DROP COLUMN "search_latency";--> statement-breakpoint
ALTER TABLE "sentiment_trends" DROP COLUMN "content_types";--> statement-breakpoint
ALTER TABLE "sentiment_trends" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "content_id";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "summary_text";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "word_count";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "original_word_count";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "summary_length";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "is_edited";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "edited_text";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "system_metrics" DROP COLUMN "component";--> statement-breakpoint
ALTER TABLE "system_metrics" DROP COLUMN "anomaly_score";--> statement-breakpoint
ALTER TABLE "system_metrics" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "content_id";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "language_code";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "content_type";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "translator_id";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "translation_metadata";--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "threshold";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "triggered_at";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "notified_users";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "notification_channels";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "alert_message";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "action_taken";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "trend_alerts" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "strength";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "confidence";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "growth_rate";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "peak_date";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "data_points";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "interpretation";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "business_impact";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "recommendations";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "trends" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "app_version";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "resolution";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "responses";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "attachments";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "user_feedback" DROP COLUMN "resolved_at";--> statement-breakpoint
ALTER TABLE "user_form_history" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "probability";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "predicted_date";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "factors";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "intervention_suggested";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "intervention_taken";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "model_version";--> statement-breakpoint
ALTER TABLE "user_predictions" DROP COLUMN "resolved_at";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "start_time";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "end_time";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "events";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "entry_page";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "referrer";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "utm_source";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "utm_medium";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "utm_campaign";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "device_type";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "browser";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "os";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "region";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "goal_completions";--> statement-breakpoint
ALTER TABLE "user_shopping" DROP COLUMN "ingredient";--> statement-breakpoint
ALTER TABLE "user_shopping" DROP COLUMN "is_checked";--> statement-breakpoint
ALTER TABLE "user_shopping" DROP COLUMN "fdc_id";--> statement-breakpoint
ALTER TABLE "validation_errors" DROP COLUMN "ai_suggestions";--> statement-breakpoint
ALTER TABLE "validation_errors" DROP COLUMN "resolution_time";--> statement-breakpoint
ALTER TABLE "validation_rules" DROP COLUMN "ai_config";--> statement-breakpoint
ALTER TABLE "voice_commands" DROP COLUMN "transcript";--> statement-breakpoint
ALTER TABLE "voice_commands" DROP COLUMN "command_type";--> statement-breakpoint
ALTER TABLE "voice_commands" DROP COLUMN "action_taken";--> statement-breakpoint
ALTER TABLE "voice_commands" DROP COLUMN "success";--> statement-breakpoint
ALTER TABLE "voice_commands" DROP COLUMN "timestamp";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "delta";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "metric_id";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "navigation_type";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "web_vitals" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "writing_sessions" DROP COLUMN "original_text";--> statement-breakpoint
ALTER TABLE "writing_sessions" DROP COLUMN "improved_text";--> statement-breakpoint
ALTER TABLE "writing_sessions" DROP COLUMN "improvements_applied";--> statement-breakpoint
ALTER TABLE "writing_sessions" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "writing_suggestions" DROP COLUMN "original_snippet";--> statement-breakpoint
ALTER TABLE "writing_suggestions" DROP COLUMN "suggested_snippet";--> statement-breakpoint
ALTER TABLE "writing_suggestions" DROP COLUMN "accepted";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "fdc_cache" ADD CONSTRAINT "fdc_cache_fdc_id_unique" UNIQUE("fdc_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_unique" UNIQUE("slug");