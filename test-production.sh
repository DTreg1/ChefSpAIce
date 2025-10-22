#!/bin/bash

echo "🚀 Testing in Production Mode..."
echo "================================"

# Stop any existing development server
echo "Stopping development server..."
pkill -f "tsx server/index.ts" 2>/dev/null || true

# Build the application
echo "Building application for production..."
npm run build

# Set production environment variables
export NODE_ENV=production

# Disable auth bypass for production testing
unset AUTH_BYPASS_ENABLED
unset AUTH_BYPASS_SECRET

echo ""
echo "📋 Environment Configuration:"
echo "  NODE_ENV: $NODE_ENV"
echo "  AUTH_BYPASS_ENABLED: ${AUTH_BYPASS_ENABLED:-<not set>}"
echo "  AUTH_BYPASS_SECRET: ${AUTH_BYPASS_SECRET:-<not set>}"
echo ""
echo "✅ Starting production server on port 5000..."
echo "   Visit http://localhost:5000 to test"
echo "   Press Ctrl+C to stop"
echo ""

# Run the production server
node dist/index.js