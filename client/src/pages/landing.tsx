import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Refrigerator, Calendar, ShoppingCart, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";
import { PageTransition } from "@/components/page-transition";
import { AnimatedCard } from "@/components/animated-card";
import { MotionButton } from "@/components/motion-button";

export default function Landing() {
  return (
    <PageTransition className="min-h-screen relative">
      <AnimatedBackground variant="both" gradientType="vibrant" particleCount={25} />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-3">
            <ChefHat className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold">ChefSpAIce</h1>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your AI-powered kitchen assistant. Manage your food inventory, discover recipes, and reduce waste—all in one place.
          </p>

          <MotionButton 
            size="lg" 
            className="mt-8"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </MotionButton>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 w-full max-w-6xl">
            <AnimatedCard data-testid="card-feature-inventory" className="glass-subtle backdrop-blur-md">
              <CardHeader>
                <Refrigerator className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Smart Inventory</CardTitle>
                <CardDescription>
                  Track what's in your fridge, freezer, and pantry with expiration reminders
                </CardDescription>
              </CardHeader>
            </AnimatedCard>

            <AnimatedCard data-testid="card-feature-recipes" className="glass-subtle backdrop-blur-md">
              <CardHeader>
                <ChefHat className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>AI Recipes</CardTitle>
                <CardDescription>
                  Generate personalized recipes based on what you have in stock
                </CardDescription>
              </CardHeader>
            </AnimatedCard>

            <AnimatedCard data-testid="card-feature-planner" className="glass-subtle backdrop-blur-md">
              <CardHeader>
                <Calendar className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Meal Planning</CardTitle>
                <CardDescription>
                  Plan your weekly meals and stay organized effortlessly
                </CardDescription>
              </CardHeader>
            </AnimatedCard>

            <AnimatedCard data-testid="card-feature-shopping" className="glass-subtle backdrop-blur-md">
              <CardHeader>
                <ShoppingCart className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Shopping Lists</CardTitle>
                <CardDescription>
                  Automatically generate shopping lists from your meal plans
                </CardDescription>
              </CardHeader>
            </AnimatedCard>
          </div>

          <AnimatedCard className="mt-12 w-full max-w-3xl glass-vibrant backdrop-blur-lg" data-testid="card-feature-ai">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Powered by AI</CardTitle>
              </div>
              <CardDescription className="text-base">
                Our intelligent assistant helps you reduce food waste, discover new recipes, 
                and make the most of your ingredients. Chat with it to get cooking tips, 
                recipe suggestions, and personalized recommendations.
              </CardDescription>
            </CardHeader>
          </AnimatedCard>
        </div>
      </div>
    </PageTransition>
  );
}
