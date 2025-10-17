import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { products } from "../shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const sampleProducts = [
  {
    id: "premium-recipe-pack",
    name: "Premium Recipe Collection",
    description: "Unlock 50 exclusive chef-curated recipes from around the world. Includes detailed nutritional information and cooking videos.",
    price: 2999,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?w=400",
    category: "recipes"
  },
  {
    id: "meal-plan-pro",
    name: "Monthly Meal Plan Pro",
    description: "Personalized meal planning for 30 days with automated shopping lists and calorie tracking.",
    price: 1999,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400",
    category: "subscriptions"
  },
  {
    id: "kitchen-essentials",
    name: "Kitchen Essentials Guide",
    description: "Complete guide to stocking your kitchen with the right tools and ingredients. Includes product recommendations and tips.",
    price: 999,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
    category: "guides"
  },
  {
    id: "nutrition-course",
    name: "Nutrition Mastery Course",
    description: "6-week online course on understanding nutrition, macros, and creating balanced meals for your health goals.",
    price: 4999,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400",
    category: "courses"
  },
  {
    id: "spice-collection",
    name: "Global Spice Collection",
    description: "Curated selection of 12 premium spices from around the world with recipe suggestions for each.",
    price: 3499,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
    category: "products"
  },
  {
    id: "cookbook-digital",
    name: "Digital Cookbook Bundle",
    description: "Collection of 5 bestselling digital cookbooks covering various cuisines and dietary preferences.",
    price: 2499,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    category: "books"
  }
];

async function seedProducts() {
  try {
    console.log("Seeding products...");
    
    // Insert products one by one to avoid conflicts
    for (const product of sampleProducts) {
      await db.insert(products)
        .values({
          ...product,
          imageUrl: product.image,
          stock: Math.floor(Math.random() * 100) + 10
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.image,
            category: product.category,
            stock: Math.floor(Math.random() * 100) + 10,
            updatedAt: new Date()
          }
        });
      
      console.log(`✓ Added product: ${product.name}`);
    }
    
    console.log("\n✅ Successfully seeded products!");
  } catch (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }
}

seedProducts();