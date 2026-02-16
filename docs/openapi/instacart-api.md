# Instacart Connect API Integration

## Architecture Overview

```
Mobile App (React Native)
    │
    ▼
useInstacart Hook (client/hooks/useInstacart.ts)
    │  - createShoppingLink()
    │  - createRecipeLink()
    │  - openShoppingLink()
    │  - openRecipeLink()
    ▼
Server API (server/routers/instacart.router.ts)
    │  - POST /api/instacart/products-link
    │  - POST /api/instacart/recipe
    │  - GET  /api/instacart/retailers
    │  - GET  /api/instacart/status
    ▼
Instacart Connect API (https://connect.instacart.com/idp/v1/...)
```

The client never calls Instacart directly. All requests are proxied through the server, which handles authentication, request transformation, error parsing, and retry logic for rate-limited requests.

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `INSTACART_API_KEY` | Yes | Bearer token for Instacart Connect API authentication |
| `NODE_ENV` | No | Controls which Instacart base URL is used |

### Base URLs

| Environment | URL |
|---|---|
| Development | `https://connect.dev.instacart.tools` |
| Production | `https://connect.instacart.com` |

## Rate Limiting

All outbound requests to Instacart use automatic retry with exponential backoff when receiving HTTP 429 responses:

- **Max retries:** 3
- **Backoff schedule:** 1s, 2s, 4s (or `Retry-After` header value if present)
- Each retry attempt is logged for observability

---

## Endpoints

### GET /api/instacart/status

Check if the Instacart integration is configured (API key present).

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true
  },
  "message": "Instacart API is configured and ready"
}
```

---

### GET /api/instacart/retailers

Find nearby Instacart retailers by postal code.

**Authentication:** INSTACART_API_KEY must be configured

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postal_code` | string | Yes | Postal/ZIP code to search |
| `country_code` | string | Yes | ISO country code (e.g., "US", "CA") |

**Example Request:**
```
GET /api/instacart/retailers?postal_code=90210&country_code=US
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "retailers": [
      {
        "retailer_key": "whole_foods",
        "name": "Whole Foods Market",
        "logo_url": "https://..."
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Instacart API key is invalid or expired",
  "errorCode": "INSTACART_RETAILERS_FAILED",
  "requestId": "uuid"
}
```

---

### POST /api/instacart/products-link

Create a shopping list link using the Instacart `/idp/v1/products/products_link` endpoint. Uses `line_items` with flat quantity/unit/brand_filters format.

**Authentication:** INSTACART_API_KEY must be configured

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `products` | array | Yes | Array of product objects |
| `products[].name` | string | Yes | Product name |
| `products[].quantity` | number | No | Quantity (default: 1) |
| `products[].unit` | string | No | Unit (default: "each", normalized via `toInstacartUnit`) |
| `products[].display_text` | string | No | Display text override |
| `products[].upc` | string | No | Single UPC code |
| `products[].upcs` | string[] | No | Array of UPC codes |
| `products[].product_ids` | string[] | No | Instacart product IDs |
| `products[].brand` | string | No | Single brand filter |
| `products[].brand_filters` | string[] | No | Array of brand filters |
| `products[].health_filters` | string[] | No | Health/dietary filters |
| `title` | string | No | List title (default: "Shopping List") |
| `linkbackUrl` | string | No | Partner linkback URL |
| `retailer_key` | string | No | Preferred retailer key |

**Example Request:**
```json
{
  "title": "Weekly Groceries",
  "products": [
    { "name": "Organic Chicken Breast", "quantity": 2, "unit": "lb", "health_filters": ["ORGANIC"] },
    { "name": "Whole Milk", "quantity": 1, "unit": "gallon" },
    { "name": "Sourdough Bread", "quantity": 1, "unit": "loaf", "brand": "Boudin" }
  ]
}
```

**Sent to Instacart as:**
```json
{
  "title": "Weekly Groceries",
  "link_type": "shopping_list",
  "line_items": [
    { "name": "Organic Chicken Breast", "quantity": 2, "unit": "lb", "display_text": "2 lb Organic Chicken Breast", "health_filters": ["ORGANIC"] },
    { "name": "Whole Milk", "quantity": 1, "unit": "gallon", "display_text": "1 gallon Whole Milk" },
    { "name": "Sourdough Bread", "quantity": 1, "unit": "loaf", "display_text": "1 loaf Sourdough Bread", "brand_filters": ["Boudin"] }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "products_link_url": "https://www.instacart.com/store/partner_recipe/..."
  }
}
```

---

### POST /api/instacart/recipe

Create a recipe shopping link using the Instacart `/idp/v1/products/recipe` endpoint. Uses `ingredients` array with `measurements` and `filters` objects (different from `products-link`).

**Authentication:** INSTACART_API_KEY must be configured

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Recipe title |
| `ingredients` | array | Yes | Array of ingredient objects (same shape as `products` in products-link) |
| `ingredients[].name` | string | Yes | Ingredient name |
| `ingredients[].quantity` | number | No | Quantity (default: 1) |
| `ingredients[].unit` | string | No | Unit (default: "each") |
| `ingredients[].display_text` | string | No | Display text override |
| `ingredients[].upc` | string | No | Single UPC code |
| `ingredients[].upcs` | string[] | No | Array of UPC codes |
| `ingredients[].product_ids` | string[] | No | Product IDs (converted to numbers) |
| `ingredients[].brand` | string | No | Single brand filter |
| `ingredients[].brand_filters` | string[] | No | Array of brand filters |
| `ingredients[].health_filters` | string[] | No | Health/dietary filters |
| `imageUrl` | string | No | Recipe image URL |
| `servings` | number | No | Number of servings |
| `cooking_time` | number | No | Cooking time in minutes |
| `instructions` | string[] | No | Array of recipe step instructions |
| `enable_pantry_items` | boolean | No | Enable pantry items in landing page |
| `linkbackUrl` | string | No | Partner linkback URL |
| `retailer_key` | string | No | Preferred retailer key |

**Example Request:**
```json
{
  "title": "Pasta Carbonara",
  "servings": 4,
  "cooking_time": 30,
  "instructions": ["Boil pasta", "Fry pancetta", "Mix eggs and cheese", "Combine all"],
  "imageUrl": "https://example.com/carbonara.jpg",
  "ingredients": [
    { "name": "Spaghetti", "quantity": 1, "unit": "lb" },
    { "name": "Pancetta", "quantity": 8, "unit": "oz" },
    { "name": "Eggs", "quantity": 4, "unit": "each" },
    { "name": "Parmesan Cheese", "quantity": 1, "unit": "cup", "brand": "Parmigiano Reggiano" }
  ]
}
```

**Sent to Instacart as:**
```json
{
  "title": "Pasta Carbonara",
  "image_url": "https://example.com/carbonara.jpg",
  "servings": 4,
  "cooking_time": 30,
  "instructions": ["Boil pasta", "Fry pancetta", "Mix eggs and cheese", "Combine all"],
  "ingredients": [
    {
      "name": "Spaghetti",
      "display_text": "1 lb Spaghetti",
      "measurements": [{ "quantity": 1, "unit": "lb" }]
    },
    {
      "name": "Pancetta",
      "display_text": "8 oz Pancetta",
      "measurements": [{ "quantity": 8, "unit": "oz" }]
    },
    {
      "name": "Eggs",
      "display_text": "4 each Eggs",
      "measurements": [{ "quantity": 4, "unit": "each" }]
    },
    {
      "name": "Parmesan Cheese",
      "display_text": "1 cup Parmesan Cheese",
      "measurements": [{ "quantity": 1, "unit": "cups" }],
      "filters": { "brand_filters": ["Parmigiano Reggiano"] }
    }
  ],
  "landing_page_configuration": {}
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "products_link_url": "https://www.instacart.com/store/partner_recipe/..."
  }
}
```

---

## Error Handling

### Error Response Format

All error responses follow this format:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_CODE",
  "requestId": "uuid"
}
```

### Error Codes

| Error Code | HTTP Status | Description |
|---|---|---|
| `INSTACART_NOT_CONFIGURED` | 400 | INSTACART_API_KEY environment variable not set |
| `MISSING_PARAMS` | 400 | Required query parameters missing |
| `MISSING_PRODUCTS` | 400 | Products/ingredients array empty or missing |
| `INVALID_PRODUCT` | 400 | Product object missing required `name` field |
| `MISSING_RECIPE_DATA` | 400 | Recipe title missing or empty |
| `INSTACART_RETAILERS_FAILED` | varies | Instacart retailer lookup failed |
| `INSTACART_PRODUCTS_LINK_FAILED` | varies | Products link creation failed |
| `INSTACART_RECIPE_LINK_FAILED` | varies | Recipe link creation failed |

### Instacart API Error Parsing

When Instacart returns an error, the server parses the response to extract meaningful messages:

**Single error:**
```json
{
  "error": { "message": "User not found", "code": 1001 },
  "meta": { "key": "user_id" }
}
```
Parsed as: `"User not found"`

**Multiple errors:**
```json
{
  "error": {
    "message": "There were issues with your request",
    "code": 9999,
    "errors": [
      { "error": { "message": "can't be blank", "code": 1001 }, "meta": { "key": "order.service_option_id" } }
    ]
  }
}
```
Parsed as: `"There were issues with your request (order.service_option_id: can't be blank)"`

**Status code fallbacks (when response body is not parseable):**

| Status | Message |
|---|---|
| 401 | Instacart API key is invalid or expired |
| 403 | Insufficient permissions for this Instacart API operation |
| 429 | Instacart API rate limit exceeded. Please try again later |
| 5xx | Instacart service is temporarily unavailable |

---

## Supported Health Filters

The following health filter values can be passed in `health_filters` arrays:

- `ORGANIC`
- `GLUTEN_FREE`
- `FAT_FREE`
- `VEGAN`
- `KOSHER`
- `SUGAR_FREE`
- `LOW_FAT`

---

## Unit Conversion

All unit strings are normalized to Instacart-compatible values via `toInstacartUnit()` in `server/lib/unit-conversion.ts`.

**Common conversions:**

| Input | Instacart Unit |
|---|---|
| `cup`, `c` | `cups` |
| `tbsp`, `tablespoons` | `tablespoon` |
| `tsp`, `teaspoons` | `teaspoon` |
| `oz`, `ounce`, `ounces` | `oz` |
| `lb`, `lbs`, `pound`, `pounds` | `lb` |
| `g`, `grams` | `gram` |
| `kg`, `kilograms` | `kg` |
| `ml`, `milliliters` | `ml` |
| `l`, `liters`, `litres` | `liter` |
| `ea`, `pc`, `pcs`, `whole`, `item` | `each` |
| `slice`, `slices` | `piece` |
| `gal`, `gallons` | `gallon` |

See `INSTACART_UNITS` and `INSTACART_ALIAS_MAP` in `server/lib/unit-conversion.ts` for the complete list.
