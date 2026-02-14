import { getUncachableStripeClient } from "../server/stripe/stripeClient";
import { PRODUCTS } from "../server/stripe/subscriptionConfig";
import { SubscriptionTier } from "../shared/subscription";

async function seedProducts() {
  console.log("Starting Stripe product seeding...");
  
  const stripe = await getUncachableStripeClient();
  
  for (const tier of [SubscriptionTier.STANDARD, SubscriptionTier.STANDARD]) {
    const config = PRODUCTS[tier];
    
    console.log(`\nProcessing ${config.name}...`);
    
    const existingProducts = await stripe.products.search({
      query: `name:'${config.name}'`,
    });
    
    let product;
    
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: {
          tier: tier,
        },
      });
      console.log(`  Created product: ${product.id}`);
    }
    
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    
    const hasMonthly = existingPrices.data.some(
      p => p.recurring?.interval === "month" && p.unit_amount === config.monthlyPrice
    );
    const hasAnnual = existingPrices.data.some(
      p => p.recurring?.interval === "year" && p.unit_amount === config.annualPrice
    );
    
    if (!hasMonthly) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.monthlyPrice,
        currency: "usd",
        recurring: {
          interval: "month",
        },
        metadata: {
          tier: tier,
          billingPeriod: "monthly",
        },
      });
      console.log(`  Created monthly price: ${monthlyPrice.id} ($${config.monthlyPrice / 100}/month)`);
    } else {
      console.log(`  Monthly price already exists`);
    }
    
    if (!hasAnnual) {
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.annualPrice,
        currency: "usd",
        recurring: {
          interval: "year",
        },
        metadata: {
          tier: tier,
          billingPeriod: "annual",
        },
      });
      console.log(`  Created annual price: ${annualPrice.id} ($${config.annualPrice / 100}/year)`);
    } else {
      console.log(`  Annual price already exists`);
    }
  }
  
  console.log("\n=== Current Stripe Products ===");
  const products = await stripe.products.list({ active: true });
  
  for (const product of products.data) {
    console.log(`\n${product.name} (${product.id})`);
    console.log(`  Tier: ${product.metadata?.tier || "Not set"}`);
    
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    
    for (const price of prices.data) {
      const interval = price.recurring?.interval || "one-time";
      const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "N/A";
      console.log(`  Price: ${price.id} - ${amount}/${interval}`);
    }
  }
  
  console.log("\n\nProduct seeding complete!");
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding products:", error);
    process.exit(1);
  });
