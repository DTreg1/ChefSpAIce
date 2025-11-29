# API Documentation

## Overview

This document describes the REST API endpoints for the ChefSpAIce application. The API follows RESTful conventions and uses JSON for request/response bodies.

**Base URL:** `/api/v1`

**Authentication:** Most endpoints require authentication via OAuth. Include the session cookie in your requests.

---

## Table of Contents

1. [Health & Status](#health--status)
2. [User Domain](#user-domain)
   - [Authentication](#authentication)
   - [Inventory](#inventory)
   - [Recipes](#recipes)
   - [Meal Plans](#meal-plans)
   - [Chat](#chat)
   - [Appliances](#appliances)
   - [Nutrition](#nutrition)
   - [Utilities](#utilities)
3. [Admin Domain](#admin-domain)
   - [User Management](#user-management)
   - [Experiments](#experiments)
   - [Cohorts](#cohorts)
   - [Maintenance](#maintenance)
   - [Moderation](#moderation)
   - [AI Metrics](#ai-metrics)
4. [AI Domain](#ai-domain)
   - [Generation](#generation)
   - [Analysis](#analysis)
   - [Vision](#vision)
   - [Voice](#voice)
   - [Email Drafting](#email-drafting)
   - [Writing Assistant](#writing-assistant)
   - [Excerpts](#excerpts)
   - [Recommendations](#recommendations)
   - [Insights](#insights)
5. [Platform Domain](#platform-domain)
   - [Analytics](#analytics)
   - [Notifications](#notifications)
   - [Batch Operations](#batch-operations)
   - [Feedback](#feedback)
6. [Specialized Services](#specialized-services)
   - [Natural Language Query](#natural-language-query)
   - [Fraud Detection](#fraud-detection)
   - [Scheduling](#scheduling)
   - [Images](#images)

---

## Health & Status

### GET /health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "version": "v1",
  "timestamp": "2025-11-25T00:00:00.000Z",
  "uptime": 12345.67,
  "environment": "development"
}
```

### GET /api/v1/info
API version information.

**Response:**
```json
{
  "version": "v1",
  "deprecationDate": null,
  "documentation": "/api/v1/docs",
  "supportedVersions": ["v1"],
  "currentVersion": "v1"
}
```

---

## User Domain

### Authentication
**Base Path:** `/api/v1/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/login` | Initiate OAuth login flow |
| GET | `/callback` | OAuth callback handler |
| POST | `/logout` | End user session |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update user profile |
| DELETE | `/me` | Delete user account |
| GET | `/session` | Get session information |

### Inventory
**Base Path:** `/api/v1/inventory`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all food items |
| POST | `/` | Add new food item |
| GET | `/:id` | Get specific food item |
| PATCH | `/:id` | Update food item |
| DELETE | `/:id` | Delete food item |
| GET | `/usda/search` | Search USDA database |
| GET | `/usda/:fdcId` | Get USDA food details |
| GET | `/expiring` | Get items expiring soon |
| POST | `/bulk` | Bulk add food items |

### Recipes
**Base Path:** `/api/v1/recipes`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user recipes |
| POST | `/` | Create new recipe |
| GET | `/:id` | Get specific recipe |
| PATCH | `/:id` | Update recipe |
| DELETE | `/:id` | Delete recipe |
| POST | `/generate` | AI-generate recipe |
| GET | `/public` | List public recipes |
| POST | `/:id/rate` | Rate a recipe |
| POST | `/:id/favorite` | Toggle favorite status |
| GET | `/favorites` | List favorite recipes |

### Meal Plans
**Base Path:** `/api/v1/meal-plans`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List meal plans |
| POST | `/` | Create meal plan |
| GET | `/:id` | Get specific meal plan |
| PATCH | `/:id` | Update meal plan |
| DELETE | `/:id` | Delete meal plan |
| POST | `/generate` | AI-generate meal plan |
| GET | `/shopping-list` | Generate shopping list |

### Chat
**Base Path:** `/api/v1/chat`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List chat sessions |
| POST | `/` | Create new chat |
| GET | `/:id` | Get chat history |
| POST | `/:id/messages` | Send message |
| DELETE | `/:id` | Delete chat |
| GET | `/stream` | SSE endpoint for real-time responses |

### Appliances
**Base Path:** `/api/v1/appliances`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user appliances |
| POST | `/` | Add appliance |
| PATCH | `/:id` | Update appliance |
| DELETE | `/:id` | Remove appliance |

### Nutrition
**Base Path:** `/api/v1/nutrition`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/daily` | Get daily nutrition summary |
| GET | `/weekly` | Get weekly nutrition report |
| POST | `/analyze` | Analyze recipe nutrition |
| GET | `/goals` | Get nutrition goals |
| PATCH | `/goals` | Update nutrition goals |

### Utilities
**Base Path:** `/api/v1/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/autosave` | Auto-save draft content |
| GET | `/autosave/:type/:id` | Retrieve auto-saved content |
| GET | `/autocomplete` | Get autocomplete suggestions |
| POST | `/validation` | Validate data |
| GET | `/cooking-terms` | List cooking terms |
| GET | `/cooking-terms/search` | Search cooking terms |

---

## Admin Domain

### User Management
**Base Path:** `/api/v1/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users (admin) |
| GET | `/users/:id` | Get user details |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| POST | `/users/:id/ban` | Ban user |
| POST | `/users/:id/unban` | Unban user |

### Experiments
**Base Path:** `/api/v1/admin/experiments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all experiments |
| POST | `/` | Create experiment |
| GET | `/:id` | Get experiment details |
| PATCH | `/:id` | Update experiment |
| DELETE | `/:id` | Delete experiment |
| POST | `/:id/start` | Start experiment |
| POST | `/:id/stop` | Stop experiment |
| GET | `/:id/results` | Get experiment results |

### Cohorts
**Base Path:** `/api/v1/admin/cohorts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user cohorts |
| POST | `/` | Create cohort |
| GET | `/:id` | Get cohort details |
| PATCH | `/:id` | Update cohort |
| DELETE | `/:id` | Delete cohort |
| POST | `/:id/users` | Add users to cohort |
| DELETE | `/:id/users/:userId` | Remove user from cohort |

### Maintenance
**Base Path:** `/api/v1/admin/maintenance`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get maintenance status |
| POST | `/enable` | Enable maintenance mode |
| POST | `/disable` | Disable maintenance mode |
| POST | `/cleanup` | Run cleanup tasks |
| GET | `/metrics` | Get system metrics |

### Moderation
**Base Path:** `/api/v1/admin/moderation`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queue` | Get moderation queue |
| POST | `/review` | Submit review decision |
| GET | `/reports` | List content reports |
| POST | `/reports/:id/resolve` | Resolve report |

### AI Metrics
**Base Path:** `/api/v1/admin/ai-metrics`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/usage` | Get AI usage statistics |
| GET | `/costs` | Get AI cost breakdown |
| GET | `/performance` | Get model performance metrics |
| GET | `/errors` | Get AI error logs |

---

## AI Domain

### Generation
**Base Path:** `/api/v1/ai/generation`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recipe` | Generate recipe from prompt |
| POST | `/meal-plan` | Generate meal plan |
| POST | `/shopping-list` | Generate shopping list |
| POST | `/description` | Generate content description |

### Analysis
**Base Path:** `/api/v1/ai/analysis`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/nutrition` | Analyze nutrition content |
| POST | `/sentiment` | Analyze text sentiment |
| POST | `/ingredients` | Extract ingredients from text |
| POST | `/classify` | Classify content |

### Vision
**Base Path:** `/api/v1/ai/vision`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/identify` | Identify food in image |
| POST | `/extract-recipe` | Extract recipe from image |
| POST | `/analyze` | General image analysis |
| POST | `/scan-receipt` | Scan shopping receipt |

### Voice
**Base Path:** `/api/v1/ai/voice`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe` | Transcribe audio to text |
| POST | `/command` | Process voice command |
| GET | `/commands` | List voice command history |

### Email Drafting
**Base Path:** `/api/v1/ai/drafts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List draft templates |
| POST | `/templates` | Create draft template |
| POST | `/generate` | Generate draft variations |
| POST | `/feedback` | Submit draft feedback |
| GET | `/history` | Get draft history |
| POST | `/quick-reply` | Generate quick replies |
| POST | `/improve` | Improve existing draft |
| GET | `/:id` | Get specific draft |
| DELETE | `/:id` | Delete draft |

### Writing Assistant
**Base Path:** `/api/v1/ai/writing`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze text for improvements |
| POST | `/improve` | Apply text improvements |
| POST | `/adjust-tone` | Adjust text tone |
| POST | `/paraphrase` | Paraphrase text |
| GET | `/stats` | Get writing statistics |
| POST | `/check-plagiarism` | Check for plagiarism |
| GET | `/sessions` | List writing sessions |
| GET | `/sessions/:id` | Get specific session |

### Excerpts
**Base Path:** `/api/v1/ai/excerpts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate excerpts from content |
| GET | `/` | List generated excerpts |
| GET | `/:id` | Get specific excerpt |
| POST | `/:id/performance` | Track excerpt performance |

### Recommendations
**Base Path:** `/api/v1/ai/recommendations`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recipes` | Get recipe recommendations |
| GET | `/meal-plans` | Get meal plan recommendations |
| GET | `/ingredients` | Get ingredient suggestions |
| POST | `/feedback` | Submit recommendation feedback |
| POST | `/semantic-search` | Semantic content search |

### Insights
**Base Path:** `/api/v1/ai/insights`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate insights from data |
| GET | `/daily` | Get daily insight summary |
| POST | `/explain` | Explain specific metric |
| GET | `/` | List all insights |
| PATCH | `/:insightId/read` | Mark insight as read |
| GET | `/stats` | Get analytics statistics |
| GET | `/trends` | Get trend analysis |
| GET | `/predictions` | Get user predictions |

---

## Platform Domain

### Analytics
**Base Path:** `/api/v1/analytics`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get analytics dashboard |
| GET | `/events` | List analytics events |
| POST | `/events` | Track custom event |
| GET | `/sessions` | Get session analytics |
| GET | `/usage` | Get usage statistics |

### Notifications
**Base Path:** `/api/v1/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List notifications |
| GET | `/:id` | Get notification |
| PATCH | `/:id/read` | Mark as read |
| DELETE | `/:id` | Delete notification |
| POST | `/tokens` | Register push token |
| DELETE | `/tokens/:token` | Remove push token |
| GET | `/intelligent/suggestions` | Get smart notifications |
| PATCH | `/intelligent/preferences` | Update preferences |

### Batch Operations
**Base Path:** `/api/v1/batch`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recipes` | Batch create recipes |
| POST | `/inventory` | Batch update inventory |
| DELETE | `/inventory` | Batch delete items |

### Feedback
**Base Path:** `/api/v1/feedback`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit feedback |
| GET | `/` | List user feedback |
| GET | `/:id` | Get feedback details |

---

## Specialized Services

### Natural Language Query
**Base Path:** `/api/v1/natural-query`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/natural` | Convert natural language to SQL |
| POST | `/execute` | Execute validated query |
| GET | `/history` | Get query history |
| GET | `/:id` | Get specific query |

### Fraud Detection
**Base Path:** `/api/v1/fraud-detection`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze transaction for fraud |
| GET | `/alerts` | Get fraud alerts |
| GET | `/report/:period` | Get fraud report |
| POST | `/review` | Review suspicious activity (admin) |
| GET | `/patterns` | Get fraud patterns (admin) |
| GET | `/high-risk` | Get high-risk users (admin) |

### Scheduling
**Base Path:** `/api/v1/scheduling`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List scheduled events |
| POST | `/` | Create scheduled event |
| GET | `/:id` | Get event details |
| PATCH | `/:id` | Update event |
| DELETE | `/:id` | Delete event |
| GET | `/availability` | Check availability |
| POST | `/sync` | Sync with external calendar |

### Images
**Base Path:** `/api/v1/images`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload image |
| GET | `/:id` | Get image |
| DELETE | `/:id` | Delete image |
| POST | `/resize` | Resize image |
| POST | `/optimize` | Optimize image |
| POST | `/extract-colors` | Extract dominant colors |

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message description",
  "details": ["Optional array of detailed error messages"]
}
```

### Common HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

API requests are rate limited per user:
- **Standard users:** 100 requests/minute
- **Premium users:** 500 requests/minute
- **AI endpoints:** 20 requests/minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

---

## Versioning

The API uses URL versioning. The current version is `v1`.

Deprecated endpoints will include headers:
- `X-Deprecation-Warning`: Description of deprecation
- `X-Deprecation-Date`: When endpoint will be removed

---

## Authentication

The API uses session-based authentication with multiple providers:
- Google OAuth 2.0
- GitHub OAuth
- X (Twitter) OAuth 2.0 with PKCE
- Apple Sign In
- Email/Password (local authentication)
- Replit Auth (OIDC, development/testing only)

To authenticate:
1. Redirect user to `/api/v1/auth/login?provider=<provider>`
2. After OAuth flow, user is redirected back with session cookie
3. Include session cookie in all subsequent requests

For email/password authentication:
1. POST to `/api/auth/email/register` for new users
2. POST to `/api/auth/email/login` for existing users

To check authentication status:
```bash
curl -X GET /api/v1/auth/session --cookie "session=..."
```

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Full CRUD for recipes, inventory, meal plans
- AI-powered features: generation, analysis, recommendations
- Admin dashboard and user management
- Analytics and insights
- Real-time chat with SSE
