CREATE TABLE "ab_test_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" varchar NOT NULL,
	"winner" text,
	"confidence" real NOT NULL,
	"p_value" real,
	"lift_percentage" real,
	"recommendation" text NOT NULL,
	"explanation" text NOT NULL,
	"insights" jsonb,
	"statistical_analysis" jsonb,
	"generated_by" text DEFAULT 'gpt-3.5-turbo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_test_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" varchar NOT NULL,
	"variant" text NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"revenue" real DEFAULT 0 NOT NULL,
	"engagement_score" real,
	"bounce_rate" real,
	"avg_session_duration" real,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"variant_a" text NOT NULL,
	"variant_b" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_audience" real DEFAULT 0.5 NOT NULL,
	"success_metric" text DEFAULT 'conversion' NOT NULL,
	"metadata" jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"metric_name" text NOT NULL,
	"insight_text" text NOT NULL,
	"importance" integer DEFAULT 3 NOT NULL,
	"period" text NOT NULL,
	"metric_data" jsonb,
	"ai_context" jsonb,
	"category" text DEFAULT 'trend' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_save_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"document_id" varchar NOT NULL,
	"document_type" text,
	"content" text NOT NULL,
	"content_hash" varchar,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	"is_auto_save" boolean DEFAULT true NOT NULL,
	"conflict_resolved" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "cohort_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"insight" text NOT NULL,
	"importance" text DEFAULT 'medium' NOT NULL,
	"category" text NOT NULL,
	"action_recommended" text,
	"confidence_score" real DEFAULT 0.5 NOT NULL,
	"supporting_data" jsonb,
	"related_cohorts" text[],
	"status" text DEFAULT 'new' NOT NULL,
	"generated_by" text DEFAULT 'gpt-5' NOT NULL,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" varchar NOT NULL,
	"metric_name" text NOT NULL,
	"period" text NOT NULL,
	"period_date" date NOT NULL,
	"value" real NOT NULL,
	"metric_type" text NOT NULL,
	"segment_data" jsonb,
	"comparison_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"refresh_frequency" text DEFAULT 'daily' NOT NULL,
	"last_refreshed" timestamp,
	"metadata" jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cohorts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "completion_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"field_name" text NOT NULL,
	"suggestion_id" varchar,
	"suggested_value" text,
	"was_selected" boolean NOT NULL,
	"final_value" text,
	"context" jsonb,
	"response_time" integer,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_name" text NOT NULL,
	"field_type" text,
	"common_values" jsonb,
	"patterns" jsonb,
	"context_rules" jsonb,
	"global_usage_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"helpful_score" integer NOT NULL,
	"comments" text,
	"was_actionable" boolean,
	"result_outcome" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" text NOT NULL,
	"issue" text NOT NULL,
	"predicted_issue" text,
	"prediction_id" varchar,
	"resolved_at" timestamp NOT NULL,
	"downtime_minutes" integer NOT NULL,
	"performed_actions" jsonb,
	"outcome" text NOT NULL,
	"performance_metrics" jsonb,
	"cost" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_predictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" text NOT NULL,
	"predicted_issue" text NOT NULL,
	"probability" real NOT NULL,
	"recommended_date" timestamp NOT NULL,
	"urgency_level" text DEFAULT 'medium' NOT NULL,
	"estimated_downtime" integer,
	"preventive_actions" jsonb,
	"model_version" text DEFAULT 'v1.0.0' NOT NULL,
	"features" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"timezone" varchar DEFAULT 'America/New_York' NOT NULL,
	"participants" text[] DEFAULT '{}' NOT NULL,
	"location" text,
	"status" varchar DEFAULT 'confirmed' NOT NULL,
	"meeting_suggestion_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" varchar NOT NULL,
	"suggested_times" jsonb NOT NULL,
	"confidence_scores" jsonb NOT NULL,
	"participants" text[] NOT NULL,
	"constraints" jsonb NOT NULL,
	"optimization_factors" jsonb DEFAULT '{"weightTimeZone":0.3,"weightPreferences":0.3,"weightMinimalDisruption":0.2,"weightAvoidConflicts":0.2}'::jsonb NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"selected_time" jsonb,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meeting_suggestions_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE "notification_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"action_at" timestamp DEFAULT now() NOT NULL,
	"engagement_time" integer,
	"followup_action" text,
	"sentiment" real DEFAULT 0,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_types" jsonb DEFAULT '{"expiringFood":{"enabled":true,"weight":1,"urgencyThreshold":2},"recipeSuggestions":{"enabled":false,"weight":0.5,"maxPerDay":2},"mealReminders":{"enabled":true,"weight":0.8,"leadTime":30},"shoppingReminders":{"enabled":false,"weight":0.6},"nutritionInsights":{"enabled":false,"weight":0.4,"frequency":"weekly"},"systemUpdates":{"enabled":false,"weight":0.3}}'::jsonb NOT NULL,
	"quiet_hours" jsonb DEFAULT '{"enabled":false,"periods":[]}'::jsonb NOT NULL,
	"frequency_limit" integer DEFAULT 10 NOT NULL,
	"enable_smart_timing" boolean DEFAULT true NOT NULL,
	"enable_relevance_scoring" boolean DEFAULT true NOT NULL,
	"preferredChannels" text[] DEFAULT '{"push","in-app"}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" varchar,
	"user_id" varchar NOT NULL,
	"relevance_score" real DEFAULT 0.5 NOT NULL,
	"optimal_time" timestamp,
	"urgency_level" integer DEFAULT 2 NOT NULL,
	"features" jsonb,
	"actual_sent_at" timestamp,
	"hold_until" timestamp,
	"model_version" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prediction_accuracy" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" varchar NOT NULL,
	"actual_outcome" text NOT NULL,
	"accuracy_score" real NOT NULL,
	"outcome_date" timestamp NOT NULL,
	"intervention_impact" text,
	"feedback_notes" text,
	"model_feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prediction_accuracy_prediction_id_unique" UNIQUE("prediction_id")
);
--> statement-breakpoint
CREATE TABLE "save_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"avg_pause_duration" real DEFAULT 2000,
	"typing_speed" real DEFAULT 40,
	"save_frequency" real DEFAULT 0.5,
	"sentence_pause_duration" real DEFAULT 2500,
	"paragraph_pause_duration" real DEFAULT 4000,
	"preferred_save_interval" real DEFAULT 3000,
	"pattern_data" jsonb,
	"model_weights" jsonb,
	"last_analyzed" timestamp DEFAULT now(),
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"common_meeting_times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meeting_frequency" jsonb NOT NULL,
	"pattern_type" varchar NOT NULL,
	"pattern_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"last_occurrence" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduling_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"preferred_times" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timezone" varchar DEFAULT 'America/New_York' NOT NULL,
	"buffer_time" integer DEFAULT 15 NOT NULL,
	"working_hours" jsonb DEFAULT '{"start":"09:00","end":"17:00","daysOfWeek":[1,2,3,4,5]}'::jsonb NOT NULL,
	"blocked_times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meeting_preferences" jsonb DEFAULT '{"preferVideo":true,"maxDailyMeetings":5,"preferredDuration":30,"avoidBackToBack":true}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scheduling_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" text NOT NULL,
	"metric_name" text NOT NULL,
	"value" real NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"anomaly_score" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trend_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trend_id" varchar,
	"user_id" varchar,
	"alert_type" text NOT NULL,
	"threshold" real,
	"conditions" jsonb,
	"priority" text DEFAULT 'medium' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"triggered_at" timestamp,
	"acknowledged_at" timestamp,
	"notified_users" text[],
	"notification_channels" text[] DEFAULT '{"in-app"}' NOT NULL,
	"alert_message" text,
	"action_taken" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trend_name" text NOT NULL,
	"trend_type" text NOT NULL,
	"strength" real NOT NULL,
	"confidence" real NOT NULL,
	"growth_rate" real,
	"start_date" timestamp NOT NULL,
	"peak_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'emerging' NOT NULL,
	"data_points" jsonb NOT NULL,
	"interpretation" text,
	"business_impact" text,
	"recommendations" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_form_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"field_name" text NOT NULL,
	"values_used" jsonb,
	"frequency_map" jsonb,
	"last_sequence" jsonb,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_predictions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"prediction_type" text NOT NULL,
	"probability" real NOT NULL,
	"predicted_date" timestamp NOT NULL,
	"factors" jsonb NOT NULL,
	"intervention_suggested" text,
	"intervention_taken" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "validation_errors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"field_name" text NOT NULL,
	"field_type" text NOT NULL,
	"error_type" text NOT NULL,
	"original_value" text,
	"suggested_value" text,
	"final_value" text,
	"user_resolution" text,
	"frequency" integer DEFAULT 1 NOT NULL,
	"context" jsonb,
	"ai_suggestions" jsonb,
	"resolution_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "validation_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_type" text NOT NULL,
	"rules" jsonb DEFAULT '{"patterns":[]}'::jsonb NOT NULL,
	"error_messages" jsonb DEFAULT '{"default":"Please enter a valid value"}'::jsonb NOT NULL,
	"suggestions" jsonb DEFAULT '{"formatHints":[]}'::jsonb NOT NULL,
	"ai_config" jsonb DEFAULT '{"useAI":true,"model":"gpt-3.5-turbo","temperature":0.3,"maxSuggestions":3}'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ab_test_insights" ADD CONSTRAINT "ab_test_insights_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_insights" ADD CONSTRAINT "analytics_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_save_drafts" ADD CONSTRAINT "auto_save_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD CONSTRAINT "cohort_insights_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_metrics" ADD CONSTRAINT "cohort_metrics_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_feedback" ADD CONSTRAINT "completion_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD CONSTRAINT "insight_feedback_insight_id_analytics_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."analytics_insights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_feedback" ADD CONSTRAINT "insight_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_prediction_id_maintenance_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."maintenance_predictions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_events" ADD CONSTRAINT "meeting_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_events" ADD CONSTRAINT "meeting_events_meeting_suggestion_id_meeting_suggestions_id_fk" FOREIGN KEY ("meeting_suggestion_id") REFERENCES "public"."meeting_suggestions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_suggestions" ADD CONSTRAINT "meeting_suggestions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD CONSTRAINT "notification_feedback_notification_id_notification_history_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_feedback" ADD CONSTRAINT "notification_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD CONSTRAINT "notification_scores_notification_id_notification_history_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_scores" ADD CONSTRAINT "notification_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_accuracy" ADD CONSTRAINT "prediction_accuracy_prediction_id_user_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."user_predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "save_patterns" ADD CONSTRAINT "save_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_patterns" ADD CONSTRAINT "scheduling_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_preferences" ADD CONSTRAINT "scheduling_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD CONSTRAINT "trend_alerts_trend_id_trends_id_fk" FOREIGN KEY ("trend_id") REFERENCES "public"."trends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_alerts" ADD CONSTRAINT "trend_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_form_history" ADD CONSTRAINT "user_form_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_predictions" ADD CONSTRAINT "user_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_errors" ADD CONSTRAINT "validation_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ab_test_insights_test_id_idx" ON "ab_test_insights" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "ab_test_insights_winner_idx" ON "ab_test_insights" USING btree ("winner");--> statement-breakpoint
CREATE INDEX "ab_test_insights_confidence_idx" ON "ab_test_insights" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "ab_test_results_test_id_idx" ON "ab_test_results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "ab_test_results_variant_idx" ON "ab_test_results" USING btree ("variant");--> statement-breakpoint
CREATE INDEX "ab_test_results_period_idx" ON "ab_test_results" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "ab_tests_status_idx" ON "ab_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ab_tests_dates_idx" ON "ab_tests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "ab_tests_created_by_idx" ON "ab_tests" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "analytics_insights_user_id_idx" ON "analytics_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_insights_importance_idx" ON "analytics_insights" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "analytics_insights_created_idx" ON "analytics_insights" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auto_save_drafts_user_id_idx" ON "auto_save_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auto_save_drafts_document_idx" ON "auto_save_drafts" USING btree ("document_id","user_id");--> statement-breakpoint
CREATE INDEX "auto_save_drafts_saved_at_idx" ON "auto_save_drafts" USING btree ("saved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auto_save_drafts_unique_version_idx" ON "auto_save_drafts" USING btree ("document_id","user_id","version");--> statement-breakpoint
CREATE INDEX "cohort_insights_cohort_id_idx" ON "cohort_insights" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "cohort_insights_importance_idx" ON "cohort_insights" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "cohort_insights_status_idx" ON "cohort_insights" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cohort_insights_category_idx" ON "cohort_insights" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cohort_insights_created_at_idx" ON "cohort_insights" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cohort_metrics_cohort_id_idx" ON "cohort_metrics" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "cohort_metrics_metric_name_idx" ON "cohort_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "cohort_metrics_period_date_idx" ON "cohort_metrics" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "cohort_metrics_type_idx" ON "cohort_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_metrics_unique_idx" ON "cohort_metrics" USING btree ("cohort_id","metric_name","period","period_date");--> statement-breakpoint
CREATE INDEX "cohorts_name_idx" ON "cohorts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cohorts_active_idx" ON "cohorts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cohorts_created_by_idx" ON "cohorts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "cohorts_last_refreshed_idx" ON "cohorts" USING btree ("last_refreshed");--> statement-breakpoint
CREATE INDEX "completion_feedback_user_idx" ON "completion_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "completion_feedback_field_idx" ON "completion_feedback" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "completion_feedback_created_idx" ON "completion_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "form_completions_field_idx" ON "form_completions" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "form_completions_updated_idx" ON "form_completions" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "insight_feedback_insight_id_idx" ON "insight_feedback" USING btree ("insight_id");--> statement-breakpoint
CREATE UNIQUE INDEX "insight_feedback_user_insight_idx" ON "insight_feedback" USING btree ("user_id","insight_id");--> statement-breakpoint
CREATE INDEX "maintenance_history_component_idx" ON "maintenance_history" USING btree ("component");--> statement-breakpoint
CREATE INDEX "maintenance_history_resolved_at_idx" ON "maintenance_history" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "maintenance_history_prediction_id_idx" ON "maintenance_history" USING btree ("prediction_id");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_component_idx" ON "maintenance_predictions" USING btree ("component");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_recommended_date_idx" ON "maintenance_predictions" USING btree ("recommended_date");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_status_idx" ON "maintenance_predictions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_probability_idx" ON "maintenance_predictions" USING btree ("probability");--> statement-breakpoint
CREATE INDEX "maintenance_predictions_urgency_idx" ON "maintenance_predictions" USING btree ("urgency_level");--> statement-breakpoint
CREATE INDEX "meeting_events_user_id_idx" ON "meeting_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meeting_events_start_time_idx" ON "meeting_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "meeting_events_status_idx" ON "meeting_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_suggestions_meeting_id_idx" ON "meeting_suggestions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_suggestions_created_by_idx" ON "meeting_suggestions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "meeting_suggestions_status_idx" ON "meeting_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_feedback_user_id_idx" ON "notification_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_feedback_notification_id_idx" ON "notification_feedback" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_feedback_action_idx" ON "notification_feedback" USING btree ("action");--> statement-breakpoint
CREATE INDEX "notification_feedback_action_at_idx" ON "notification_feedback" USING btree ("action_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_feedback_unique_idx" ON "notification_feedback" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_updated_idx" ON "notification_preferences" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "notification_scores_user_id_idx" ON "notification_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_scores_notification_id_idx" ON "notification_scores" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_scores_hold_until_idx" ON "notification_scores" USING btree ("hold_until");--> statement-breakpoint
CREATE INDEX "notification_scores_relevance_idx" ON "notification_scores" USING btree ("relevance_score");--> statement-breakpoint
CREATE INDEX "prediction_accuracy_prediction_id_idx" ON "prediction_accuracy" USING btree ("prediction_id");--> statement-breakpoint
CREATE INDEX "prediction_accuracy_score_idx" ON "prediction_accuracy" USING btree ("accuracy_score");--> statement-breakpoint
CREATE INDEX "prediction_accuracy_outcome_date_idx" ON "prediction_accuracy" USING btree ("outcome_date");--> statement-breakpoint
CREATE UNIQUE INDEX "save_patterns_user_idx" ON "save_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "save_patterns_analyzed_idx" ON "save_patterns" USING btree ("last_analyzed");--> statement-breakpoint
CREATE INDEX "scheduling_patterns_user_id_idx" ON "scheduling_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduling_patterns_type_idx" ON "scheduling_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "scheduling_preferences_user_id_idx" ON "scheduling_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_metrics_component_timestamp_idx" ON "system_metrics" USING btree ("component","timestamp");--> statement-breakpoint
CREATE INDEX "system_metrics_metric_name_idx" ON "system_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "system_metrics_anomaly_score_idx" ON "system_metrics" USING btree ("anomaly_score");--> statement-breakpoint
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "trend_alerts_trend_id_idx" ON "trend_alerts" USING btree ("trend_id");--> statement-breakpoint
CREATE INDEX "trend_alerts_user_id_idx" ON "trend_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trend_alerts_type_idx" ON "trend_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "trend_alerts_priority_idx" ON "trend_alerts" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "trend_alerts_triggered_at_idx" ON "trend_alerts" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "trend_alerts_active_idx" ON "trend_alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "trends_status_idx" ON "trends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trends_type_idx" ON "trends" USING btree ("trend_type");--> statement-breakpoint
CREATE INDEX "trends_strength_idx" ON "trends" USING btree ("strength");--> statement-breakpoint
CREATE INDEX "trends_start_date_idx" ON "trends" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "trends_peak_date_idx" ON "trends" USING btree ("peak_date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_form_history_unique_idx" ON "user_form_history" USING btree ("user_id","field_name");--> statement-breakpoint
CREATE INDEX "user_form_history_user_idx" ON "user_form_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_form_history_field_idx" ON "user_form_history" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "user_form_history_updated_idx" ON "user_form_history" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "user_predictions_user_id_idx" ON "user_predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_predictions_type_idx" ON "user_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "user_predictions_probability_idx" ON "user_predictions" USING btree ("probability");--> statement-breakpoint
CREATE INDEX "user_predictions_status_idx" ON "user_predictions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_predictions_predicted_date_idx" ON "user_predictions" USING btree ("predicted_date");--> statement-breakpoint
CREATE INDEX "validation_errors_user_field_idx" ON "validation_errors" USING btree ("user_id","field_name");--> statement-breakpoint
CREATE INDEX "validation_errors_field_type_idx" ON "validation_errors" USING btree ("field_type");--> statement-breakpoint
CREATE INDEX "validation_errors_error_type_idx" ON "validation_errors" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "validation_errors_created_idx" ON "validation_errors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "validation_rules_field_type_idx" ON "validation_rules" USING btree ("field_type");--> statement-breakpoint
CREATE INDEX "validation_rules_active_priority_idx" ON "validation_rules" USING btree ("is_active","priority");