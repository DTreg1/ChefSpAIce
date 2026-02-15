import express, { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, subscriptions } from "@shared/schema";
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { successResponse } from '../lib/apiResponse';
import { invalidateSubscriptionCache } from '../lib/subscription-cache';

const router = express.Router();

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || '';

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    aliases: string[];
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number;
    environment: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    is_family_share?: boolean;
    country_code?: string;
    price?: number;
    currency?: string;
    store?: string;
    subscriber_attributes?: Record<string, { value: string; updated_at_ms: number }>;
  };
}

function verifyWebhookSecret(req: Request): boolean {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    logger.warn('No RevenueCat webhook secret configured');
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedSecret = authHeader.slice(7);
  return providedSecret === REVENUECAT_WEBHOOK_SECRET;
}

function mapProductIdToTier(productId: string): 'STANDARD' {
  return 'STANDARD';
}

function mapEntitlementToTier(entitlementId: string | undefined): 'STANDARD' | null {
  if (!entitlementId) return null;
  
  const lowerEntitlement = entitlementId.toLowerCase();
  if (lowerEntitlement === 'pro' || lowerEntitlement === 'basic' || lowerEntitlement === 'standard') {
    return 'STANDARD';
  }
  return null;
}

async function handleSubscriptionUpdate(
  event: RevenueCatWebhookEvent['event'],
  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing',
  keepTier: boolean
): Promise<void> {
  const userId = event.app_user_id;
  
  const entitlementTier = mapEntitlementToTier(event.entitlement_id);
  const productTier = mapProductIdToTier(event.product_id);
  const tier = entitlementTier || productTier;
  const now = new Date();

  logger.info("RevenueCat processing subscription", { productId: event.product_id, entitlementId: event.entitlement_id, resolvedTier: tier });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    logger.info("RevenueCat user not found", { userId });
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionTier: keepTier ? tier : 'STANDARD',
      subscriptionStatus: status,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;

  await db
    .update(subscriptions)
    .set({
      status,
      ...(expirationDate ? { currentPeriodEnd: expirationDate } : {}),
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId));

  await invalidateSubscriptionCache(userId);

  logger.info("RevenueCat updated subscription", { userId, tier: keepTier ? tier : 'STANDARD', status });
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!verifyWebhookSecret(req)) {
      throw AppError.unauthorized('Invalid webhook secret', 'INVALID_WEBHOOK_SECRET');
    }

    const webhookData = req.body as RevenueCatWebhookEvent;
    const { event } = webhookData;

    logger.info("RevenueCat received event", { eventType: event.type, userId: event.app_user_id });

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        await handleSubscriptionUpdate(event, 'active', true);
        break;

      case 'CANCELLATION':
        await handleSubscriptionUpdate(event, 'canceled', true);
        break;

      case 'BILLING_ISSUE':
        await handleSubscriptionUpdate(event, 'past_due', true);
        break;

      case 'EXPIRATION':
        await handleSubscriptionUpdate(event, 'expired', false);
        break;

      case 'TEST':
        logger.info('RevenueCat test event received');
        break;

      default:
        logger.info("RevenueCat unhandled event type", { eventType: event.type });
    }

    return res.status(200).json(successResponse({ received: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
