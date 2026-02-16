# Fix 3: Create IAP Products in App Store Connect

## Problem
Apple rejected the app under Guideline 2.1 (IAP) because the in-app purchase products were not submitted in App Store Connect. The app references products that don't exist in Apple's system.

## Current Product IDs in Code
```typescript
PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.chefspaice.basic.monthly',
  BASIC_YEARLY: 'com.chefspaice.basic.yearly',
  PRO_MONTHLY: 'com.chefspaice.pro.monthly',
  PRO_YEARLY: 'com.chefspaice.pro.yearly',
}
```

## Goal
Create all subscription products in App Store Connect with matching Product IDs, configure subscription groups, and submit for review.

---

## Step-by-Step Instructions

### Step 1: Log into App Store Connect

```
1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Navigate to "My Apps"
4. Select "ChefSpAIce" app
```

### Step 2: Navigate to Subscriptions

```
1. In the app dashboard, click "Subscriptions" in the left sidebar
2. If prompted to create a Subscription Group, proceed to Step 3
3. If you already have subscription groups, review and update them
```

### Step 3: Create Subscription Groups

```
Create TWO subscription groups:

Group 1: "ChefSpAIce Basic"
- Display Name: ChefSpAIce Basic
- Description: Essential kitchen management features

Group 2: "ChefSpAIce Pro"  
- Display Name: ChefSpAIce Pro
- Description: Advanced features including AI recipe generation
```

### Step 4: Create Basic Monthly Subscription

```
In the "ChefSpAIce Basic" group, click "+ Create Subscription"

Reference Name: Basic Monthly
Product ID: com.chefspaice.basic.monthly  (MUST MATCH EXACTLY)

Subscription Duration: 1 Month
Subscription Price: 
- Select your base country (e.g., United States)
- Set price (e.g., $2.99/month)
- Click "Generate All Prices" to auto-fill other countries

Localization (English):
- Display Name: Basic Monthly
- Description: Essential kitchen management with inventory tracking and basic recipes

Review Screenshot:
- Upload a screenshot of the subscription purchase screen
- Must show subscription details clearly
```

### Step 5: Create Basic Yearly Subscription

```
In the "ChefSpAIce Basic" group, click "+ Create Subscription"

Reference Name: Basic Yearly
Product ID: com.chefspaice.basic.yearly  (MUST MATCH EXACTLY)

Subscription Duration: 1 Year
Subscription Price:
- Set price (e.g., $24.99/year - ~$2.08/month, 30% savings)

Localization (English):
- Display Name: Basic Yearly
- Description: Essential kitchen management with inventory tracking and basic recipes (Save 30% with annual billing)

Review Screenshot:
- Upload same or similar screenshot as monthly
```

### Step 6: Create Pro Monthly Subscription

```
In the "ChefSpAIce Pro" group, click "+ Create Subscription"

Reference Name: Pro Monthly
Product ID: com.chefspaice.pro.monthly  (MUST MATCH EXACTLY)

Subscription Duration: 1 Month
Subscription Price:
- Set price (e.g., $7.99/month)

Localization (English):
- Display Name: Pro Monthly
- Description: Full access including AI-powered recipe generation, advanced meal planning, and unlimited cloud sync

Review Screenshot:
- Upload a screenshot showing Pro features
```

### Step 7: Create Pro Yearly Subscription

```
In the "ChefSpAIce Pro" group, click "+ Create Subscription"

Reference Name: Pro Yearly
Product ID: com.chefspaice.pro.yearly  (MUST MATCH EXACTLY)

Subscription Duration: 1 Year
Subscription Price:
- Set price (e.g., $59.99/year - ~$5/month, 37% savings)

Localization (English):
- Display Name: Pro Yearly
- Description: Full access including AI-powered recipe generation, advanced meal planning, and unlimited cloud sync (Save 37% with annual billing)

Review Screenshot:
- Upload same or similar screenshot as Pro Monthly
```

### Step 8: Configure Subscription Upgrade/Downgrade

```
For each subscription group, configure the upgrade/downgrade/crossgrade behavior:

In "ChefSpAIce Basic" group settings:
- Yearly is a "crossgrade" to Monthly (same level, different duration)

In "ChefSpAIce Pro" group settings:
- Yearly is a "crossgrade" to Monthly (same level, different duration)

Between groups:
- Pro is an "upgrade" from Basic
- Basic is a "downgrade" from Pro
```

### Step 9: Add App Store Promotions (Optional)

```
For each subscription, you can add promotional images:
1. Click on the subscription
2. Scroll to "App Store Promotion"
3. Upload promotional image (1024x1024 or 1024x768)
4. This image appears in App Store search and browse
```

### Step 10: Submit Products for Review

```
1. Ensure all products have status "Ready to Submit"
2. The products will be reviewed when you submit the app
3. Make sure app binary references the exact Product IDs
4. Include subscription screenshot in app metadata
```

### Step 11: Verify Product IDs Match Code

```
Double-check that Product IDs in App Store Connect match exactly:

App Store Connect          |  Code (storekit-service.ts)
---------------------------|---------------------------
com.chefspaice.basic.monthly | PRODUCT_IDS.BASIC_MONTHLY
com.chefspaice.basic.yearly  | PRODUCT_IDS.BASIC_YEARLY
com.chefspaice.pro.monthly   | PRODUCT_IDS.PRO_MONTHLY
com.chefspaice.pro.yearly    | PRODUCT_IDS.PRO_YEARLY

ANY MISMATCH WILL CAUSE IAP TO FAIL!
```

---

## Required Screenshots

### Subscription Screen Screenshot Requirements:
1. Show the subscription options (Basic/Pro, Monthly/Yearly)
2. Display pricing clearly
3. Show subscription benefits
4. Include "Restore Purchases" button
5. Show terms of service link

### How to Capture:
```
1. Run app in iOS Simulator
2. Navigate to subscription/paywall screen
3. Take screenshot (Cmd+S in Simulator)
4. Crop to remove device frame if needed
5. Upload to App Store Connect for each product
```

---

## Pricing Reference

| Product | Duration | Suggested Price | Annual Savings |
|---------|----------|-----------------|----------------|
| Basic Monthly | 1 Month | $2.99 | - |
| Basic Yearly | 1 Year | $24.99 | 30% |
| Pro Monthly | 1 Month | $7.99 | - |
| Pro Yearly | 1 Year | $59.99 | 37% |

---

## Verification Checklist

- [ ] Logged into App Store Connect
- [ ] Created "ChefSpAIce Basic" subscription group
- [ ] Created "ChefSpAIce Pro" subscription group
- [ ] Created com.chefspaice.basic.monthly product
- [ ] Created com.chefspaice.basic.yearly product
- [ ] Created com.chefspaice.pro.monthly product
- [ ] Created com.chefspaice.pro.yearly product
- [ ] All Product IDs match code exactly (case-sensitive)
- [ ] Prices set for all territories
- [ ] Localizations added (at minimum: English)
- [ ] Review screenshots uploaded for each product
- [ ] Products show "Ready to Submit" status
- [ ] Upgrade/downgrade paths configured
