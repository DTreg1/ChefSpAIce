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
import { UnifiedRecipeDialog } from "@/components/unified-recipe-dialog";
import { OfflineIndicator } from "@/components/offline-indicator";
import { RouteLoading } from "@/components/route-loading";
import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
// Keep critical providers eagerly loaded for proper initialization
import { PushNotificationHandler } from "@/components/PushNotificationHandler";
import { VoiceControl } from "@/components/voice/VoiceControl";
import { ChatWidget } from "@/components/ChatWidget";
import { FeedbackWidget } from "@/components/feedback-widget";
// Only lazy load non-critical visual components
import { LazyAnimatedBackground } from "@/components/lazy/LazyProviders";

// Eagerly loaded pages (critical path)
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Chat from "@/pages/chat"; // Keep Chat eager since it's the default route

// Lazy loaded pages (code splitting)
const Storage = lazy(() => import("@/pages/storage"));
const Cookbook = lazy(() => import("@/pages/cookbook"));
const Nutrition = lazy(() => import("@/pages/nutrition"));
const AIAssistant = lazy(() => import("@/pages/ai-assistant"));
const MealPlanner = lazy(() => import("@/pages/meal-planner"));
const ShoppingList = lazy(() => import("@/pages/shopping-list"));
const Appliances = lazy(() => import("@/pages/appliances"));
const Equipment = lazy(() => import("@/pages/equipment"));
const Settings = lazy(() => import("@/pages/settings"));
const Orders = lazy(() => import("@/pages/orders"));
const FoodGroups = lazy(() => import("@/pages/food-groups"));
const FeedbackAnalytics = lazy(() => import("@/pages/feedback-analytics"));
const FeedbackBoard = lazy(() => import("@/pages/feedback-board"));
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const Donate = lazy(() => import("@/pages/donate"));
const DonateSuccess = lazy(() => import("@/pages/donate-success"));
const About = lazy(() => import("@/pages/about"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const CameraTest = lazy(() => import("@/pages/camera-test"));
const CookingTermsAdmin = lazy(() => import("@/pages/cooking-terms-admin"));
const Glossary = lazy(() => import("@/pages/glossary"));
const Notifications = lazy(() => import("@/pages/notifications"));
const SmartSearch = lazy(() => import("@/pages/smart-search"));
const AIFeatures = lazy(() => import("@/pages/AIFeatures"));
const SummarizationDemo = lazy(() => import("@/pages/summarization-demo"));
const SemanticSearchDemo = lazy(() => import("@/pages/SemanticSearchDemo"));
const NotFound = lazy(() => import("@/pages/not-found"));
const TagDemo = lazy(() => import("@/pages/TagDemo"));
const RecommendationsDemo = lazy(() => import("@/pages/recommendations-demo"));
const RecommendationsPublicDemo = lazy(
  () => import("@/pages/recommendations-public-demo"),
);
const QueryBuilder = lazy(() => import("@/pages/QueryBuilder"));
const Drafts = lazy(() => import("@/pages/Drafts"));
const WritingAssistant = lazy(() => import("@/pages/writing-assistant"));
const Summarization = lazy(() => import("@/pages/summarization"));
const ExcerptGenerator = lazy(() => import("@/pages/excerpt-generator"));
const TranslationDemo = lazy(() => import("@/pages/TranslationDemo"));
const AltTextManagement = lazy(() => import("@/pages/alt-text-management"));
const ModerationDashboard = lazy(() => import("@/pages/moderation"));
const ModerationTest = lazy(() => import("@/pages/moderation-test"));
const FraudDashboard = lazy(() => import("@/pages/fraud-dashboard"));
const SentimentDashboard = lazy(() => import("@/pages/sentiment-dashboard"));
const FormCompletionDemo = lazy(() => import("@/pages/form-completion-demo"));
const ValidationDemo = lazy(() => import("@/pages/validation-demo"));
const RetentionDashboard = lazy(() => import("@/pages/RetentionDashboard"));
const TrendsDashboard = lazy(() => import("@/pages/trends-dashboard"));
const ABTesting = lazy(() => import("@/pages/ABTesting"));
const CohortAnalysis = lazy(() => import("@/pages/CohortAnalysis"));
const SystemHealth = lazy(() => import("@/pages/SystemHealth"));
const Scheduling = lazy(() => import("@/pages/Scheduling"));
const TicketRouting = lazy(() => import("@/pages/ticket-routing"));
const ExtractionPage = lazy(() => import("@/pages/extraction"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const ImageEnhancement = lazy(() => import("@/pages/ImageEnhancement"));
const FaceDetectionDemo = lazy(() => import("@/pages/FaceDetectionDemo"));
const OCRPage = lazy(() => import("@/pages/ocr"));
const TranscriptionsPage = lazy(() => import("@/pages/transcriptions"));

function AuthenticatedRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Chat} />
        <Route path="/chat" component={Chat} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/cookbook" component={Cookbook} />
        <Route path="/tag-demo" component={TagDemo} />
        <Route path="/nutrition" component={Nutrition} />
        <Route path="/meal-planner" component={MealPlanner} />
        <Route path="/shopping-list" component={ShoppingList} />
        <Route path="/appliances" component={Appliances} />
        <Route path="/equipment" component={Equipment} />
        <Route path="/orders" component={Orders} />
        <Route path="/inventory" component={Storage} />
        <Route path="/storage/all" component={Storage} />
        <Route path="/storage/:location" component={Storage} />
        <Route path="/food-groups/:category" component={FoodGroups} />
        <Route path="/food-groups" component={FoodGroups} />
        <Route path="/analytics-dashboard" component={AnalyticsDashboard} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
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
        <Route path="/glossary" component={Glossary} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/smart-search" component={SmartSearch} />
        <Route path="/ai-features" component={AIFeatures} />
        <Route path="/summarization-demo" component={SummarizationDemo} />
        <Route path="/semantic-search" component={SemanticSearchDemo} />
        <Route path="/recommendations-demo" component={RecommendationsDemo} />
        <Route path="/query-builder" component={QueryBuilder} />
        <Route path="/drafts" component={Drafts} />
        <Route path="/writing-assistant" component={WritingAssistant} />
        <Route path="/summarization" component={Summarization} />
        <Route path="/excerpt-generator" component={ExcerptGenerator} />
        <Route path="/translation-demo" component={TranslationDemo} />
        <Route path="/alt-text" component={AltTextManagement} />
        <Route path="/moderation" component={ModerationDashboard} />
        <Route path="/moderation-test" component={ModerationTest} />
        <Route path="/fraud-dashboard" component={FraudDashboard} />
        <Route path="/sentiment-dashboard" component={SentimentDashboard} />
        <Route path="/form-completion-demo" component={FormCompletionDemo} />
        <Route path="/validation-demo" component={ValidationDemo} />
        <Route path="/retention-dashboard" component={RetentionDashboard} />
        <Route path="/trends-dashboard" component={TrendsDashboard} />
        <Route path="/ab-testing" component={ABTesting} />
        <Route path="/cohort-analysis" component={CohortAnalysis} />
        <Route path="/system-health" component={SystemHealth} />
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/ticket-routing" component={TicketRouting} />
        <Route path="/extraction" component={ExtractionPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/images" component={ImageEnhancement} />
        <Route path="/face-detection" component={FaceDetectionDemo} />
        <Route path="/ocr" component={OCRPage} />
        <Route path="/transcriptions" component={TranscriptionsPage} />
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
      <Suspense fallback={<RouteLoading />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/about" component={About} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route
            path="/recommendations-public-demo"
            component={RecommendationsPublicDemo}
          />
          <Route path="/ocr" component={OCRPage} />
          <Route component={Landing} />
        </Switch>
      </Suspense>
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

  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  const { data: preferences, isLoading: prefLoading } = useCachedQuery<any>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  // Listen for keyboard shortcut custom events
  useEffect(() => {
    const handleOpenAddFood = () => setAddFoodOpen(true);
    const handleGenerateSmartRecipe = () => {
      // This will trigger the smart recipe generation
      const button = document.querySelector<HTMLButtonElement>(
        '[data-testid="button-smart-recipe-quick"]',
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
      document.removeEventListener(
        "generateSmartRecipe",
        handleGenerateSmartRecipe,
      );
      document.removeEventListener("escapePressed", handleEscape);
    };
  }, []);

  // Check if onboarding needs to be shown
  const showOnboarding =
    !prefLoading && (!preferences || !preferences.hasCompletedOnboarding);

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
  }, [showOnboarding]); // Re-attach listener when onboarding status changes

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  // Show landing page layout for non-authenticated users
  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Show app layout with header (with or without sidebar based on onboarding status)
  return (
    <>
      {/* Lazy-loaded animated background only on chat pages */}
      <LazyAnimatedBackground />


      {/* Critical providers - eagerly loaded for proper initialization */}
      {location !== "/" && <PushNotificationHandler />}
      {location !== "/" && <ChatWidget />}

      <UnifiedAddFood open={addFoodOpen} onOpenChange={setAddFoodOpen} />
      <UnifiedRecipeDialog
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
      />

      {/* Conditionally show feedback widget on non-chat pages */}
      {location !== "/" && !location.startsWith("/chat") && <FeedbackWidget />}

      <SidebarProvider style={style}>
        <div className="flex flex-col h-screen w-full relative overflow-x-hidden">
          {/* Header outside the sidebar container but inside SidebarProvider */}
          <header
            className={cn(
              "flex items-center gap-4 p-4 border-b transition-all-smooth sticky top-0 z-[60] w-full",
              scrolled
                ? "glass-ultra navbar-scroll scrolled shadow-lg"
                : "glass-vibrant border-border/30",
            )}
          >
            {!showOnboarding && (
              <SidebarTrigger
                data-testid="button-sidebar-toggle"
                className="transition-morph hover:scale-105"
              />
            )}
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
            {!showOnboarding && (
              <div className="ml-auto flex items-center gap-2">
                <VoiceControl />
                <QuickActionsBar
                  onAddFood={() => setAddFoodOpen(true)}
                  onGenerateRecipe={() => setRecipeDialogOpen(true)}
                />
              </div>
            )}
          </header>

          {/* Main content area with sidebar (if completed onboarding) and main content */}
          <div className="flex flex-1 min-h-0 w-full">
            {showOnboarding ? (
              <main
                ref={mainRef}
                className="flex-1 overflow-y-auto overflow-x-hidden"
              >
                <Onboarding />
              </main>
            ) : (
              <>
                <AppSidebar />
                <main
                  ref={mainRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden"
                >
                  <Router />
                </main>
              </>
            )}
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
