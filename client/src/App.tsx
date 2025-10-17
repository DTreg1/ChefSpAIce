// Referenced from blueprint:javascript_log_in_with_replit - Added authentication routing
import { useState, useEffect, useRef, lazy, Suspense, startTransition } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { cn } from "@/lib/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChefHat, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useInitialData } from "@/hooks/useInitialData";
import { useReplitWarmup } from "@/hooks/useReplitWarmup";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { OfflineIndicator } from "@/components/offline-indicator";
import { InitialLoadingScreen } from "@/components/InitialLoadingScreen";

// Lazy load all heavy components to improve initial load
const AppSidebar = lazy(() => import("@/components/app-sidebar").then(m => ({ default: m.AppSidebar })));
const CommandPalette = lazy(() => import("@/components/command-palette").then(m => ({ default: m.CommandPalette })));
const QuickActionsBar = lazy(() => import("@/components/quick-actions-bar").then(m => ({ default: m.QuickActionsBar })));
const AddFoodDialog = lazy(() => import("@/components/add-food-dialog").then(m => ({ default: m.AddFoodDialog })));
const RecipeCustomizationDialog = lazy(() => import("@/components/recipe-customization-dialog").then(m => ({ default: m.RecipeCustomizationDialog })));
const FeedbackWidget = lazy(() => import("@/components/feedback-widget").then(m => ({ default: m.FeedbackWidget })));
const AnimatedBackground = lazy(() => import("@/components/animated-background").then(m => ({ default: m.AnimatedBackground })));

// Eagerly loaded core pages (only the most critical)
const Landing = lazy(() => import("@/pages/landing"));
const Chat = lazy(() => import("@/pages/chat"));

// Lazy load onboarding since it's only shown for new users
const Onboarding = lazy(() => import("@/pages/onboarding"));

// Lazy load all secondary pages to improve initial load performance
const Storage = lazy(() => import("@/pages/storage"));
const Cookbook = lazy(() => import("@/pages/cookbook"));
const Nutrition = lazy(() => import("@/pages/nutrition"));
const MealPlanner = lazy(() => import("@/pages/meal-planner"));
const ShoppingList = lazy(() => import("@/pages/shopping-list"));
const Appliances = lazy(() => import("@/pages/appliances"));
const Settings = lazy(() => import("@/pages/settings"));
const FdcSearch = lazy(() => import("@/pages/FdcSearch"));
const FoodGroups = lazy(() => import("@/pages/food-groups"));
const FeedbackAnalytics = lazy(() => import("@/pages/feedback-analytics"));
const FeedbackBoard = lazy(() => import("@/pages/feedback-board"));
const Donate = lazy(() => import("@/pages/donate"));
const DonateSuccess = lazy(() => import("@/pages/donate-success"));
const About = lazy(() => import("@/pages/about"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const CameraTest = lazy(() => import("@/pages/camera-test"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component for lazy loaded routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Chat} />
        <Route path="/chat" component={Chat} />
        <Route path="/cookbook" component={Cookbook} />
        <Route path="/nutrition" component={Nutrition} />
        <Route path="/meal-planner" component={MealPlanner} />
        <Route path="/shopping-list" component={ShoppingList} />
        <Route path="/appliances" component={Appliances} />
        <Route path="/storage/:location" component={Storage} />
        <Route path="/food-groups" component={FoodGroups} />
        <Route path="/fdc-search" component={FdcSearch} />
        <Route path="/feedback-analytics" component={FeedbackAnalytics} />
        <Route path="/feedback" component={FeedbackBoard} />
        <Route path="/donate" component={Donate} />
        <Route path="/donate/success" component={DonateSuccess} />
        <Route path="/settings" component={Settings} />
        <Route path="/about" component={About} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/camera-test" component={CameraTest} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Router() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Show landing page for non-authenticated users
  if (authLoading || !isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </Switch>
      </Suspense>
    );
  }

  // Show authenticated app with sidebar (data loading happens in components)
  return <AuthenticatedRouter />;
}

function AppContent() {
  const { isWarmedUp } = useReplitWarmup();
  const { isAuthenticated, isLoading } = useAuth();
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [location] = useLocation();

  // Use batch initialization for better performance
  // This will fetch all initial data in one request and populate individual query caches
  const { data: initialData, isLoading: initialDataLoading } = useInitialData(isAuthenticated);

  const preferences = initialData?.preferences;
  const prefLoading = initialDataLoading;

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

  // Show loading screen while warming up connection or checking authentication
  if (!isWarmedUp || isLoading) {
    return <InitialLoadingScreen />;
  }
  
  // Show landing page layout for non-authenticated users
  if (!isAuthenticated) {
    return <Router />;
  }

  // Show onboarding full-screen without sidebar if not completed
  if (!prefLoading && (!preferences || !preferences.hasCompletedOnboarding)) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Onboarding />
      </Suspense>
    );
  }

  // Show app layout with sidebar for authenticated users who completed onboarding
  return (
    <>
      <Suspense fallback={null}>
        <AnimatedBackground
          variant="both"
          gradientType="soft"
          particleCount={30}
        />
        <CommandPalette
          onAddFood={() => startTransition(() => setAddFoodOpen(true))}
          onGenerateRecipe={() => startTransition(() => setRecipeDialogOpen(true))}
          onScanBarcode={() => {
            // Navigate to FDC search page with barcode scanner
            window.location.href = "/fdc-search?scanBarcode=true";
          }}
        />
        <AddFoodDialog open={addFoodOpen} onOpenChange={setAddFoodOpen} />
        <RecipeCustomizationDialog
          open={recipeDialogOpen}
          onOpenChange={setRecipeDialogOpen}
        />
        {/* Only show floating FeedbackWidget on non-chat pages */}
        {location !== '/' && !location.startsWith('/chat') && <FeedbackWidget />}
      </Suspense>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center transition-morph hover:scale-110 shadow-lg glow-primary">
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
              <Suspense fallback={null}>
                <QuickActionsBar
                  onAddFood={() => startTransition(() => setAddFoodOpen(true))}
                  onGenerateRecipe={() => startTransition(() => setRecipeDialogOpen(true))}
                  onScanBarcode={() => {
                    // Navigate to FDC search page with barcode scanner
                    window.location.href = "/fdc-search?scanBarcode=true";
                  }}
                />
              </Suspense>
            </div>
          </header>
          
          {/* Main content area with sidebar and main content */}
          <div className="flex flex-1 min-h-0 w-full">
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>
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
    <GlobalErrorBoundary>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <OfflineIndicator />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GlobalErrorBoundary>
  );
}
