#!/bin/bash

echo "🔐 Testing Authentication Security..."
echo "===================================="
echo ""

# Test 1: Check if authentication works normally (without bypass)
echo "Test 1: Normal Authentication (should fail without login)"
echo "---------------------------------------------------------"
curl -s -o /dev/null -w "Response: %{http_code}\n" http://localhost:5000/api/auth/user
echo ""

# Test 2: Check if bypass is disabled in production mode
echo "Test 2: Production Mode Bypass (should be disabled)"
echo "---------------------------------------------------"
echo "Testing with bypass header but without development mode..."
curl -s -o /dev/null -w "Response: %{http_code}\n" \
  -H "x-auth-bypass-secret: test123" \
  http://localhost:5000/api/auth/user
echo ""

# Test 3: Check if analytics endpoint handles unauthenticated requests
echo "Test 3: Analytics Endpoint (should return 200 even without auth)"
echo "----------------------------------------------------------------"
curl -s -o /dev/null -w "Response: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"FCP","value":1000,"rating":"good","delta":100,"id":"test123"}' \
  http://localhost:5000/api/analytics
echo ""

echo "✅ Security Tests Complete"
echo ""
echo "Expected Results:"
echo "  Test 1: 401 (Unauthorized - normal behavior)"
echo "  Test 2: 401 (Bypass should not work without dev mode)"
echo "  Test 3: 200 (Analytics should accept data gracefully)"