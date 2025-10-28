-- Database initialization script
-- This file is automatically executed when the PostgreSQL container starts
-- It's useful for setting up initial database configurations

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default timezone
SET timezone = 'UTC';

-- Create custom types if needed (examples)
-- CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator');
-- CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- You can add initial seed data here if needed
-- Note: Schema tables are created by Drizzle via npm run db:push
-- This file is for PostgreSQL-specific setup and seed data only

-- Example: Create a default admin user (uncomment if needed)
-- INSERT INTO users (email, name, role) 
-- VALUES ('admin@example.com', 'Admin User', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- Grant permissions if using specific database users
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Add any other database initialization here
COMMENT ON DATABASE myapp IS 'Full-stack JavaScript application database';