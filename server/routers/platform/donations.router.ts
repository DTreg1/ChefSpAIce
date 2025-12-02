import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../../storage/index";

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

router.post("/create-payment-intent", async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const { amount, donorEmail, donorName, message, anonymous } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Minimum donation is $1.00" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        donorName: anonymous ? "Anonymous" : donorName || "Anonymous",
        donorEmail: donorEmail || "",
        message: message || "",
        anonymous: anonymous ? "true" : "false",
      },
    });

    const userId = (req as any).user?.id || null;

    await storage.admin.billing.createDonation({
      userId,
      amount,
      currency: "usd",
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      receiptEmail: donorEmail || undefined,
      message: message || undefined,
      isRecurring: false,
      metadata: {
        donorName: anonymous ? "Anonymous" : donorName || "Anonymous",
        anonymous: anonymous || false,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

router.post("/update-donor-info", async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, donorName, donorEmail, message, anonymous } =
      req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID required" });
    }

    const donation =
      await storage.admin.billing.getDonationByPaymentIntent(paymentIntentId);

    if (!donation) {
      return res.status(404).json({ error: "Donation not found" });
    }

    await storage.admin.billing.updateDonation(paymentIntentId, {
      receiptEmail: donorEmail || undefined,
      message: message || undefined,
      metadata: {
        ...(donation.metadata || {}),
        donorName: anonymous ? "Anonymous" : donorName || "Anonymous",
        anonymous: anonymous || false,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating donor info:", error);
    res.status(500).json({ error: "Failed to update donor info" });
  }
});

router.post("/confirm", async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID required" });
    }

    await storage.admin.billing.updateDonation(paymentIntentId, {
      status: "completed",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error confirming donation:", error);
    res.status(500).json({ error: "Failed to confirm donation" });
  }
});

router.get("/recent", async (_req: Request, res: Response) => {
  try {
    const result = await storage.admin.billing.getDonations(10, 0);
    const completedDonations = result.donations
      .filter((d: any) => d.status === "completed")
      .map((d: any) => ({
        id: d.id,
        amount: d.amount,
        donorName: d.metadata?.donorName || "Anonymous",
        message: d.message,
        createdAt: d.createdAt,
      }))
      .slice(0, 5);
    res.json(completedDonations);
  } catch (error) {
    console.error("Error fetching recent donations:", error);
    res.json([]);
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await storage.admin.billing.getTotalDonations();
    res.json({
      totalAmount: stats.totalAmount || 0,
      donationCount: stats.donationCount || 0,
    });
  } catch (error) {
    console.error("Error fetching donation stats:", error);
    res.json({ totalAmount: 0, donationCount: 0 });
  }
});

export default router;
