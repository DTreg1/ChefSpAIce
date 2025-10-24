-- Performance indexes for frequently queried fields
-- This script adds indexes that improve query performance for the ChefSpAIce application

-- Users table: Index on frequently accessed fields
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Food items table: Composite and single column indexes for common queries
CREATE INDEX IF NOT EXISTS idx_food_items_user_expiration ON food_items(user_id, expiration_date);
CREATE INDEX IF NOT EXISTS idx_food_items_storage_location ON food_items(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_food_items_fdc_id ON food_items(fcd_id);
CREATE INDEX IF NOT EXISTS idx_food_items_food_category ON food_items(food_category);

-- JSONB indexes for users table
-- GIN index for storageLocations array searches
CREATE INDEX IF NOT EXISTS idx_users_storage_locations_gin ON users USING gin(storage_locations);
-- GIN index for preferences object searches
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING gin(preferences);
-- GIN index for recentActivities array searches  
CREATE INDEX IF NOT EXISTS idx_users_recent_activities_gin ON users USING gin(recent_activities);

-- JSONB indexes for food_items table
-- GIN index for USDA data searches
CREATE INDEX IF NOT EXISTS idx_food_items_usda_data_gin ON food_items USING gin(usda_data);

-- JSONB indexes for chat_messages table
-- GIN index for attachments array
CREATE INDEX IF NOT EXISTS idx_chat_messages_attachments_gin ON chat_messages USING gin(attachments);

-- Recipes table: Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recipes_user_created ON recipes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_user_favorite ON recipes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);

-- Meal plans table: Composite indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date_meal ON meal_plans(user_id, date, meal_type);

-- Feedback table: Composite indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category_status ON feedback(category, status);

-- Appliances table: Indexes for lookup queries
CREATE INDEX IF NOT EXISTS idx_appliances_user_active ON appliances(user_id, is_active);

-- Analytics table: Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_time ON analytics(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON analytics(user_id, timestamp DESC);

-- Barcode products table: Additional index for product searches
CREATE INDEX IF NOT EXISTS idx_barcode_products_name_trgm ON barcode_products USING gin(product_name gin_trgm_ops);

-- Partial indexes for common filtered queries
-- Active food items that aren't expired
CREATE INDEX IF NOT EXISTS idx_food_items_active ON food_items(user_id, expiration_date) 
WHERE expiration_date > CURRENT_DATE;

-- Non-dismissed expiration notifications
CREATE INDEX IF NOT EXISTS idx_food_items_pending_notifications ON food_items(user_id, expiration_date, notification_dismissed) 
WHERE notification_dismissed = false;

-- Active meal plans (upcoming dates)
CREATE INDEX IF NOT EXISTS idx_meal_plans_upcoming ON meal_plans(user_id, date) 
WHERE date >= CURRENT_DATE;