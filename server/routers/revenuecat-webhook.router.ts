import express, { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

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
    console.warn('[RevenueCat] No webhook secret configured');
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedSecret = authHeader.slice(7);
  return providedSecret === REVENUECAT_WEBHOOK_SECRET;
}

function mapProductIdToTier(productId: string): 'BASIC' | 'PRO' {
  if (productId.includes('pro')) {
    return 'PRO';
  }
  return 'BASIC';
}

async function handleSubscriptionEvent(event: RevenueCatWebhookEvent['event'], isActive: boolean): Promise<void> {
  const userId = event.app_user_id;
  const tier = mapProductIdToTier(event.product_id);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    console.log(`[RevenueCat] User not found: ${userId}`);
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionTier: isActive ? tier : 'BASIC',
      subscriptionStatus: isActive ? 'active' : 'expired',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`[RevenueCat] Updated subscription for user ${userId}: ${tier}, active: ${isActive}`);
}

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSecret(req)) {
      console.warn('[RevenueCat] Invalid webhook secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const webhookData = req.body as RevenueCatWebhookEvent;
    const { event } = webhookData;

    console.log(`[RevenueCat] Received event: ${event.type} for user ${event.app_user_id}`);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        await handleSubscriptionEvent(event, true);
        break;

      case 'CANCELLATION':
      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        await handleSubscriptionEvent(event, false);
        break;

      case 'TEST':
        console.log('[RevenueCat] Test event received');
        break;

      default:
        console.log(`[RevenueCat] Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[RevenueCat] Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
