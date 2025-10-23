// Referenced from blueprint:javascript_log_in_with_replit - Added authentication routing
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { cn } from "@/lib/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChefHat } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProgressiveDisclosureProvider } from "@/contexts/ProgressiveDisclosureContext";
import { AppSidebar } from "@/components/app-sidebar";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { UnifiedAddFood } from "@/components/unified-add-food";
import { RecipeCustomizationDialog } from "@/components/recipe-customization-dialog";
import { FeedbackWidget } from "@/components/feedback-widget";
import { AnimatedBackground } from "@/components/animated-background";
import { OfflineIndicator } from "@/components/offline-indicator";
import { RouteLoading } from "@/components/route-loading";
import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useToast } from "@/hooks/use-toast";
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { apiRequest } from "@/lib/queryClient";
import ErrorBoundary from "@/components/ErrorBoundary";

// Eagerly loaded pages (critical path)
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Chat from "@/pages/chat"; // Keep Chat eager since it's the default route

// Lazy loaded pages (code splitting)
const Storage = lazy(() => import("@/pages/storage"));
const Cookbook = lazy(() => import("@/pages/cookbook"));
const Nutrition = lazy(() => import("@/pages/nutrition"));
const MealPlanner = lazy(() => import("@/pages/meal-planner"));
const ShoppingList = lazy(() => import("@/pages/shopping-list"));
const Appliances = lazy(() => import("@/pages/appliances"));
const Settings = lazy(() => import("@/pages/settings"));
const FoodGroups = lazy(() => import("@/pages/food-groups"));
const FeedbackAnalytics = lazy(() => import("@/pages/feedback-analytics"));
const FeedbackBoard = lazy(() => import("@/pages/feedback-board"));
const AnalyticsDashboard = lazy(() => import("@/pages/analytics-dashboard"));
const Donate = lazy(() => import("@/pages/donate"));
const DonateSuccess = lazy(() => import("@/pages/donate-success"));
const About = lazy(() => import("@/pages/about"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const CameraTest = lazy(() => import("@/pages/camera-test"));
const CookingTermsAdmin = lazy(() => import("@/pages/cooking-terms-admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AuthenticatedRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Chat} />
        <Route path="/chat" component={Chat} />
        <Route path="/cookbook" component={Cookbook} />
        <Route path="/nutrition" component={Nutrition} />
        <Route path="/meal-planner" component={MealPlanner} />
        <Route path="/shopping-list" component={ShoppingList} />
        <Route path="/appliances" component={Appliances} />
        <Route path="/inventory" component={Storage} />
        <Route path="/storage/all" component={Storage} />
        <Route path="/storage/:location" component={Storage} />
        <Route path="/food-groups/:category" component={FoodGroups} />
        <Route path="/food-groups" component={FoodGroups} />
        <Route path="/analytics" component={AnalyticsDashboard} />
        <Route path="/feedback-analytics" component={FeedbackAnalytics} />
        <Route path="/feedback" component={FeedbackBoard} />
        <Route path="/donate" component={Donate} />
        <Route path="/donate/success" component={DonateSuccess} />
        <Route path="/settings" component={Settings} />
        <Route path="/about" component={About} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/camera-test" component={CameraTest} />
        <Route path="/cooking-terms-admin" component={CookingTermsAdmin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show landing page for non-authenticated users
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Show authenticated app with sidebar
  return <AuthenticatedRouter />;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [location] = useLocation();
  const { toast } = useToast();

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  const { data: preferences, isLoading: prefLoading } = useCachedQuery<{
    hasCompletedOnboarding?: boolean;
  }>({
    queryKey: ["/api/auth/user"],
    cacheKey: "cache:user:preferences",
    enabled: isAuthenticated,
  });

  // Listen for keyboard shortcut custom events
  useEffect(() => {
    const handleOpenAddFood = () => setAddFoodOpen(true);
    const handleGenerateSmartRecipe = () => {
      // This will trigger the smart recipe generation
      const button = document.querySelector<HTMLButtonElement>(
        '[data-testid="button-smart-recipe-quick"]'
      );
      if (button) {
        button.click();
      } else {
        // Fallback to opening the recipe customization dialog
        setRecipeDialogOpen(true);
      }
    };
    const handleEscape = () => {
      setAddFoodOpen(false);
      setRecipeDialogOpen(false);
      // Dispatch event to clear any selections
      const clearEvent = new CustomEvent("clearSelections");
      document.dispatchEvent(clearEvent);
    };

    document.addEventListener("openAddFoodDialog", handleOpenAddFood);
    document.addEventListener("generateSmartRecipe", handleGenerateSmartRecipe);
    document.addEventListener("escapePressed", handleEscape);

    return () => {
      document.removeEventListener("openAddFoodDialog", handleOpenAddFood);
      document.removeEventListener("generateSmartRecipe", handleGenerateSmartRecipe);
      document.removeEventListener("escapePressed", handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        const isScrolled = mainRef.current.scrollTop > 10;
        setScrolled(isScrolled);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;


  // Show landing page layout for non-authenticated users
  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Show onboarding full-screen without sidebar if not completed
  if (!prefLoading && (!preferences || !preferences.hasCompletedOnboarding)) {
    return <Onboarding />;
  }

  // Show app layout with sidebar for authenticated users who completed onboarding
  return (
    <>
      {/* Only show animated background on chat/home page */}
      {(location === "/" || location === "/chat") && (
        <AnimatedBackground
          variant="both"
          gradientType="primary"
          particleCount={2000}
        />
      )}
      <UnifiedAddFood open={addFoodOpen} onOpenChange={setAddFoodOpen} />
      <RecipeCustomizationDialog
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
      />
      {/* Only show floating FeedbackWidget on non-chat pages */}
      {location !== '/' && !location.startsWith('/chat') && <FeedbackWidget />}
      <SidebarProvider style={style}>
        <div className="flex flex-col h-screen w-full relative overflow-x-hidden">
          {/* Header is now at the top level, outside the flex container with sidebar */}
          <header
            className={cn(
              "flex items-center gap-4 p-4 border-b transition-all-smooth sticky top-0 z-[60] w-full",
              scrolled
                ? "glass-ultra navbar-scroll scrolled shadow-lg"
                : "glass-vibrant border-border/30",
            )}
          >
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="transition-morph hover:scale-105"
            />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/5 flex items-center justify-center shadow-lg glow-primary">
                <ChefHat className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gradient-primary font-sans">
                  ChefSpAIce
                </h1>
                <p className="text-xs text-muted-foreground">
                  Your Kitchen Assistant
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <QuickActionsBar
                onAddFood={() => setAddFoodOpen(true)}
                onGenerateRecipe={() => setRecipeDialogOpen(true)}
              />
            </div>
          </header>

          {/* Main content area with sidebar and main content */}
          <div className="flex flex-1 min-h-0 w-full">
            <AppSidebar />
            <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ProgressiveDisclosureProvider>
            <AppContent />
            <Toaster />
            <OfflineIndicator />
          </ProgressiveDisclosureProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
