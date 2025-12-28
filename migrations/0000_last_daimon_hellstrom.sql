CREATE TABLE "appliances" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "appliances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"image_url" varchar(255),
	"is_common" boolean DEFAULT false,
	"alternatives" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "appliances_name_unique" UNIQUE("name")
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
CREATE TABLE "cooking_terms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cooking_terms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"term" varchar(100) NOT NULL,
	"definition" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"difficulty" varchar(20) DEFAULT 'beginner',
	"pronunciation" varchar(100),
	"video_url" varchar(255),
	"related_terms" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cooking_terms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text,
	"category" text,
	"expiry_date" date,
	"storage_location" text DEFAULT 'refrigerator',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutrition_corrections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nutrition_corrections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar,
	"product_name" text NOT NULL,
	"barcode" varchar(50),
	"brand" varchar(200),
	"original_source" varchar(50),
	"original_source_id" varchar(100),
	"original_nutrition" text,
	"corrected_nutrition" text,
	"image_url" text,
	"notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_appliances" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_appliances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"appliance_id" integer NOT NULL,
	"notes" text,
	"brand" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_sync_data" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_sync_data_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"inventory" text,
	"recipes" text,
	"meal_plans" text,
	"shopping_list" text,
	"preferences" text,
	"cookware" text,
	"waste_log" text,
	"consumed_log" text,
	"analytics" text,
	"onboarding" text,
	"custom_locations" text,
	"user_profile" text,
	"last_synced_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sync_data_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"password" varchar,
	"display_name" varchar,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
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
	"primary_provider" varchar,
	"primary_provider_id" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_corrections" ADD CONSTRAINT "nutrition_corrections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_appliances" ADD CONSTRAINT "user_appliances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_appliances" ADD CONSTRAINT "user_appliances_appliance_id_appliances_id_fk" FOREIGN KEY ("appliance_id") REFERENCES "public"."appliances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sync_data" ADD CONSTRAINT "user_sync_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appliances_category" ON "appliances" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_appliances_is_common" ON "appliances" USING btree ("is_common");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_providers_provider_user" ON "auth_providers" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "idx_auth_providers_user" ON "auth_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cooking_terms_term" ON "cooking_terms" USING btree ("term");--> statement-breakpoint
CREATE INDEX "idx_cooking_terms_category" ON "cooking_terms" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_nutrition_corrections_status" ON "nutrition_corrections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_nutrition_corrections_barcode" ON "nutrition_corrections" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "idx_nutrition_corrections_created" ON "nutrition_corrections" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_appliances_unique" ON "user_appliances" USING btree ("user_id","appliance_id");