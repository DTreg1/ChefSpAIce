import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Refrigerator, Calendar, ShoppingCart, Sparkles } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  useEffect(() => {
    console.log("[Landing] Page mounted, testing endpoints...");
    
    // Test simple endpoint first
    console.log("[Landing] Testing simple endpoint...");
    fetch('/api/test')
      .then(res => {
        console.log(`[Landing] Test endpoint response: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("[Landing] Test response:", data);
      })
      .catch(err => {
        console.error("[Landing] Test endpoint error:", err);
      });

    // Then test auth endpoint
    console.log("[Landing] Testing auth endpoint...");
    fetch('/api/auth/user', { 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        console.log(`[Landing] Auth check response: ${res.status}`);
        return res.text();
      })
      .then(text => {
        console.log("[Landing] Auth response body:", text);
      })
      .catch(err => {
        console.error("[Landing] Auth check error:", err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-950/50 via-background to-green-50/30 dark:from-lime-950/20 dark:via-background dark:to-green-950/20">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="bg-red-500 text-white p-4 rounded">DEBUG: Landing Page Mounted</div>
          <div className="flex items-center gap-3">
            <ChefHat className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold">ChefSpAIce</h1>
          </div>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Your AI-powered kitchen assistant. Manage your food inventory, discover recipes, and reduce waste—all in one place.
          </p>

          <Button 
            size="lg" 
            className="mt-8"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </Button>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 w-full max-w-6xl">
            <Card data-testid="card-feature-inventory">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <Refrigerator className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Smart Inventory</CardTitle>
                <CardDescription>
                  Track what's in your fridge, freezer, and pantry with expiration reminders
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-recipes">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <ChefHat className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>AI Recipes</CardTitle>
                <CardDescription>
                  Generate personalized recipes based on what you have in stock
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-planner">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Meal Planning</CardTitle>
                <CardDescription>
                  Plan your weekly meals and stay organized effortlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-shopping">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Shopping Lists</CardTitle>
                <CardDescription>
                  Automatically generate shopping lists from your meal plans
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="mt-12 w-full max-w-3xl" data-testid="card-feature-ai">
            <CardHeader>
              <div className="flex justify-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Powered by AI</CardTitle>
              </div>
              <CardDescription className="text-base">
                Our intelligent assistant helps you reduce food waste, discover new recipes, 
                and make the most of your ingredients. Chat with it to get cooking tips, 
                recipe suggestions, and personalized recommendations.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
