import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Refrigerator, Calendar, ShoppingCart, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-3">
            <ChefHat className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold">Kitchen Wizard</h1>
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
                <Refrigerator className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Smart Inventory</CardTitle>
                <CardDescription>
                  Track what's in your fridge, freezer, and pantry with expiration reminders
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-recipes">
              <CardHeader>
                <ChefHat className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>AI Recipes</CardTitle>
                <CardDescription>
                  Generate personalized recipes based on what you have in stock
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-planner">
              <CardHeader>
                <Calendar className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Meal Planning</CardTitle>
                <CardDescription>
                  Plan your weekly meals and stay organized effortlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-shopping">
              <CardHeader>
                <ShoppingCart className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Shopping Lists</CardTitle>
                <CardDescription>
                  Automatically generate shopping lists from your meal plans
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="mt-12 w-full max-w-3xl" data-testid="card-feature-ai">
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
          </Card>
        </div>
      </div>
    </div>
  );
}
