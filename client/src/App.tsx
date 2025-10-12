// Referenced from blueprint:javascript_log_in_with_replit - Added authentication routing
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
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
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/cookbook" component={Cookbook} />
      <Route path="/nutrition" component={Nutrition} />
      <Route path="/meal-planner" component={MealPlanner} />
      <Route path="/shopping-list" component={ShoppingList} />
      <Route path="/appliances" component={Appliances} />
      <Route path="/storage/:location" component={Storage} />
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
  const { data: preferences, isLoading: prefLoading } = useQuery<{ hasCompletedOnboarding?: boolean }>({
    queryKey: ["/api/user/preferences"],
    enabled: isAuthenticated && !isLoading,
  });

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  // Show landing page layout for non-authenticated users
  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Show onboarding outside the main layout to allow scrolling
  if (!prefLoading && (!preferences || !preferences.hasCompletedOnboarding)) {
    return <Onboarding />;
  }

  // Show app layout with sidebar for authenticated users
  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
