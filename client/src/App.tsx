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
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { AddFoodDialog } from "@/components/add-food-dialog";
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
      <Route path="/settings" component={Settings} />
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
      <CommandPalette 
        onAddFood={() => setAddFoodOpen(true)}
        onGenerateRecipe={() => {
          // Navigate to storage page for recipe generation
          window.location.href = '/storage/all';
        }}
      />
      <AddFoodDialog open={addFoodOpen} onOpenChange={setAddFoodOpen} />
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className={cn(
              "flex items-center justify-between p-4 border-b transition-all-smooth sticky top-0 z-20",
              scrolled ? "glass-strong navbar-scroll scrolled shadow-glass" : "glass-subtle border-border/50"
            )}>
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="transition-morph" />
                <span className="text-xs text-muted-foreground hidden md:block transition-all-smooth">
                  Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded transition-all-smooth">⌘K</kbd> for quick actions
                </span>
              </div>
              <ThemeToggle />
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
