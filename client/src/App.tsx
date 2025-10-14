// Referenced from blueprint:javascript_log_in_with_replit - Added authentication routing
import { useState, useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { cn } from "@/lib/utils";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { AddFoodDialog } from "@/components/add-food-dialog";
import { RecipeCustomizationDialog } from "@/components/recipe-customization-dialog";
import { FeedbackWidget } from "@/components/feedback-widget";
import { AnimatedBackground } from "@/components/animated-background";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Chat from "@/pages/chat";
import Storage from "@/pages/storage";
import Cookbook from "@/pages/cookbook";
import Nutrition from "@/pages/nutrition";
import MealPlanner from "@/pages/meal-planner";
import ShoppingList from "@/pages/shopping-list";
import Appliances from "@/pages/appliances";
import Settings from "@/pages/settings";
import FdcSearch from "@/pages/FdcSearch";
import FoodGroups from "@/pages/food-groups";
import FeedbackAnalytics from "@/pages/feedback-analytics";
import Donate from "@/pages/donate";
import DonateSuccess from "@/pages/donate-success";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
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
      <Route path="/donate" component={Donate} />
      <Route path="/donate/success" component={DonateSuccess} />
      <Route path="/settings" component={Settings} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
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
  
  const { data: preferences, isLoading: prefLoading } = useQuery<{ hasCompletedOnboarding?: boolean }>({
    queryKey: ["/api/user/preferences"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        const isScrolled = mainRef.current.scrollTop > 10;
        setScrolled(isScrolled);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => mainElement.removeEventListener('scroll', handleScroll);
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
      <AnimatedBackground variant="both" gradientType="soft" particleCount={15} />
      <CommandPalette 
        onAddFood={() => setAddFoodOpen(true)}
        onGenerateRecipe={() => setRecipeDialogOpen(true)}
        onScanBarcode={() => {
          // Navigate to FDC search page with barcode scanner
          window.location.href = '/fdc-search?scanBarcode=true';
        }}
      />
      <AddFoodDialog open={addFoodOpen} onOpenChange={setAddFoodOpen} />
      <RecipeCustomizationDialog 
        open={recipeDialogOpen} 
        onOpenChange={setRecipeDialogOpen}
      />
      <FeedbackWidget />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full relative">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className={cn(
              "flex items-center gap-4 p-4 border-b transition-all-smooth sticky top-0 z-20",
              scrolled ? "glass-ultra navbar-scroll scrolled shadow-lg" : "glass-vibrant border-border/30"
            )}>
              <SidebarTrigger data-testid="button-sidebar-toggle" className="transition-morph hover:scale-105" />
              <div className="ml-auto">
                <QuickActionsBar 
                  onAddFood={() => setAddFoodOpen(true)}
                  onGenerateRecipe={() => setRecipeDialogOpen(true)}
                  onScanBarcode={() => {
                    // Navigate to FDC search page with barcode scanner
                    window.location.href = '/fdc-search?scanBarcode=true';
                  }}
                />
              </div>
            </header>
            <main ref={mainRef} className="flex-1 overflow-auto">
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
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
