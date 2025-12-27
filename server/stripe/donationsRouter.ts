import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { getUncachableStripeClient } from "./stripeClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

const router = Router();

router.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const stripe = await getUncachableStripeClient();

    const {
      amount,
      donorName,
      donorEmail,
      message,
      anonymous,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Minimum donation is $1.00" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation",
              description: message || "Thank you for your generous support!",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl ||
        `${process.env.REPLIT_DOMAINS?.split(",")[0] ? "https://" + process.env.REPLIT_DOMAINS?.split(",")[0] : "http://localhost:5000"}/api/donations/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl ||
        `${process.env.REPLIT_DOMAINS?.split(",")[0] ? "https://" + process.env.REPLIT_DOMAINS?.split(",")[0] : "http://localhost:5000"}/api/donations/cancel`,
      customer_email: donorEmail || undefined,
      metadata: {
        donorName: anonymous ? "Anonymous" : donorName || "Anonymous",
        donorEmail: donorEmail || "",
        message: message || "",
        anonymous: anonymous ? "true" : "false",
        type: "donation",
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/session/:sessionId", async (req: Request, res: Response) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.payment_status,
      amount: session.amount_total,
      donorName: session.metadata?.donorName || "Anonymous",
      message: session.metadata?.message || null,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

router.get("/recent", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        cs.id,
        cs.amount_total as amount,
        cs.metadata->>'donorName' as donor_name,
        cs.metadata->>'message' as message,
        cs.created
      FROM stripe.checkout_sessions cs
      WHERE cs.payment_status = 'paid'
        AND cs.metadata->>'type' = 'donation'
      ORDER BY cs.created DESC
      LIMIT 5
    `);

    const donations = result.rows.map((row: any) => ({
      id: row.id,
      amount: row.amount || 0,
      donorName: row.donor_name || "Anonymous",
      message: row.message,
      createdAt: new Date(row.created * 1000).toISOString(),
    }));

    res.json(donations);
  } catch (error) {
    console.error("Error fetching recent donations:", error);
    res.json([]);
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(amount_total), 0) as total_amount,
        COUNT(*) as donation_count
      FROM stripe.checkout_sessions
      WHERE payment_status = 'paid'
        AND metadata->>'type' = 'donation'
    `);

    const stats = result.rows[0];
    res.json({
      totalAmount: parseInt(stats.total_amount) || 0,
      donationCount: parseInt(stats.donation_count) || 0,
    });
  } catch (error) {
    console.error("Error fetching donation stats:", error);
    res.json({ totalAmount: 0, donationCount: 0 });
  }
});

router.get("/publishable-key", async (_req: Request, res: Response) => {
  try {
    const { getStripePublishableKey } = await import("./stripeClient");
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error("Error fetching publishable key:", error);
    res.status(500).json({ error: "Failed to get Stripe publishable key" });
  }
});

router.get("/success", async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Donation Successful</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 24px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon svg { width: 40px; height: 40px; stroke: white; }
        h1 { color: #1f2937; font-size: 28px; margin-bottom: 12px; }
        p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .close-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1>Thank You!</h1>
        <p>Your donation was successful. Your generosity helps us continue our mission to reduce food waste.</p>
        <button class="close-btn" onclick="window.close()">Close this window</button>
      </div>
    </body>
    </html>
  `);
});

router.get("/cancel", async (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Donation Cancelled</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 24px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: #f59e0b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon svg { width: 40px; height: 40px; stroke: white; }
        h1 { color: #1f2937; font-size: 28px; margin-bottom: 12px; }
        p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .close-btn {
          background: #6b7280;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h1>Donation Cancelled</h1>
        <p>No worries! You can return to the app and try again whenever you're ready.</p>
        <button class="close-btn" onclick="window.close()">Close this window</button>
      </div>
    </body>
    </html>
  `);
});

export default router;
