import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getUncachableStripeClient } from "../stripe/stripeClient";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const donationCheckoutSchema = z.object({
  amount: z.number().int().min(100, "Minimum donation is $1.00"),
  anonymous: z.boolean().optional().default(false),
  successUrl: z.string().url("Valid success URL is required"),
  cancelUrl: z.string().url("Valid cancel URL is required"),
});

router.post("/create-checkout-session", validateBody(donationCheckoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, anonymous, successUrl, cancelUrl } = req.body;

    const allowedDomains = (process.env.REPLIT_DOMAINS || "").split(",").map(d => d.trim()).filter(Boolean);
    for (const url of [successUrl, cancelUrl]) {
      try {
        const parsed = new URL(url);
        const isAllowed = allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
        if (!isAllowed) {
          throw AppError.badRequest("Redirect URL must match the application domain", "INVALID_REDIRECT_URL");
        }
      } catch (e) {
        if (e instanceof AppError) throw e;
        throw AppError.badRequest("Invalid redirect URL format", "INVALID_REDIRECT_URL");
      }
    }

    const stripe = await getUncachableStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "ChefSpAIce Donation",
              description: "Support ChefSpAIce's mission to reduce food waste",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: "donation",
        anonymous: anonymous ? "true" : "false",
      },
    });

    return res.json(successResponse({ url: session.url }));
  } catch (error) {
    next(error);
  }
});

export default router;
