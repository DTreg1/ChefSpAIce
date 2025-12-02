import { useState, useEffect } from "react";
import {
  Home,
  Refrigerator,
  Snowflake,
  Pizza,
  UtensilsCrossed,
  ChefHat,
  BookOpen,
  Apple,
  CalendarDays,
  ShoppingCart,
  Settings,
  LayoutGrid,
  ChevronRight,
  BarChart3,
  Heart,
  Info,
  Shield,
  ScrollText,
  LogOut,
  Activity,
  Brain,
  Bot,
  FileSearch,
  DollarSign,
  Image,
  Pen,
  FileText,
  ScanLine,
  Mic,
  Sparkles,
  Languages,
  Camera,
  ImagePlus,
  Bell,
  Package,
  FileEdit,
  AlertTriangle,
  Smile,
  Users,
  TrendingUp,
  PieChart,
  Server,
  Calendar,
  Headphones,
  Search,
  Beaker,
  Tag,
  FormInput,
  CheckCircle,
  Video,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { CacheStorage } from "@/lib/cacheStorage";
import { queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categoryIcons";
import type {
  StorageLocation,
  UserInventory as FoodItem,
} from "@shared/schema";

const iconMap: Record<string, any> = {
  refrigerator: Refrigerator,
  snowflake: Snowflake,
  pizza: Pizza,
  "utensils-crossed": UtensilsCrossed,
};

// Shorten long USDA category names for sidebar display
function shortenCategoryName(category: string): string {
  const mappings: Record<string, string> = {
    "Cereal Grains and Pasta": "Grains & Pasta",
    "Dairy and Egg Products": "Dairy & Eggs",
    "Fats and Oils": "Fats & Oils",
    "Fruits and Fruit Juices": "Fruits & Juices",
    "Vegetables and Vegetable Products": "Vegetables",
    "Sausages and Luncheon Meats": "Deli Meats",
    "Spices and Herbs": "Spices & Herbs",
    "Beef Products": "Beef",
    "Pork Products": "Pork",
    "Poultry Products": "Poultry",
    "Finfish and Shellfish Products": "Seafood",
    "Legumes and Legume Products": "Legumes",
    "Nut and Seed Products": "Nuts & Seeds",
    Sweets: "Sweets",
    "Baby Foods": "Baby Foods",
    "Baked Products": "Baked Goods",
    Beverages: "Beverages",
    "Breakfast Cereals": "Cereals",
    "Fast Foods": "Fast Food",
    "Meals, Entrees, and Side Dishes": "Meals & Sides",
    Snacks: "Snacks",
    "Soups, Sauces, and Gravies": "Soups & Sauces",
    "American Indian/Alaska Native Foods": "Native Foods",
    "Restaurant Foods": "Restaurant",
  };

  return mappings[category] || category;
}

export function AppSidebar() {
  const [location] = useLocation();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [foodGroupsOpen, setFoodGroupsOpen] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();
  const { user } = useAuth();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Clear stale cache and invalidate React Query cache on mount
  useEffect(() => {
    // Clear localStorage cache
    CacheStorage.remove("cache:storage:locations");
    // Force React Query to refetch fresh data from the API
    queryClient.invalidateQueries({
      queryKey: [API_ENDPOINTS.inventory.storageLocations],
    });
  }, []);

  const { data: storageLocations, refetch: _refetchStorageLocations } =
    useStorageLocations();

  const { data: foodItemsResponse } = useQuery<{
    data: FoodItem[];
    pagination?: { total: number };
  }>({
    queryKey: [API_ENDPOINTS.inventory.foodItems],
  });

  // Extract the array from the paginated response structure
  const foodItems = Array.isArray(foodItemsResponse)
    ? foodItemsResponse
    : foodItemsResponse?.data || [];

  const totalItems =
    foodItemsResponse?.pagination?.total || foodItems?.length || 0;

  const aiAssistantItem = {
    id: "ai-assistant",
    name: "AI Assistant",
    icon: Bot,
    path: "/",
  };

  // Group food items by category for the sidebar
  const groupedItems = (foodItems || []).reduce(
    (acc, item) => {
      const category = item.foodCategory || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, FoodItem[]>,
  );

  const foodCategories = Object.keys(groupedItems).sort();

  return (
    <>
      <Sidebar className="shadow-2xl">
        <SidebarContent className="p-4">
          <span className="p-10" />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === aiAssistantItem.path}
                    className="transition-morph hover:pl-1"
                  >
                    <Link
                      href={aiAssistantItem.path}
                      data-testid="link-ai-assistant"
                      onClick={handleLinkClick}
                    >
                      <aiAssistantItem.icon className="w-4 h-4 transition-morph" />
                      <span className="flex-1">{aiAssistantItem.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Planning
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/meal-planner"}
                  >
                    <Link
                      href="/meal-planner"
                      data-testid="link-meal-planner"
                      onClick={handleLinkClick}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span className="flex-1">Meal Planner</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/shopping-list"}
                  >
                    <Link
                      href="/shopping-list"
                      data-testid="link-shopping-list"
                      onClick={handleLinkClick}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="flex-1">Shopping List</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Recipes & Nutrition
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/cookbook"}
                  >
                    <Link
                      href="/cookbook"
                      data-testid="link-cookbook"
                      onClick={handleLinkClick}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span className="flex-1">My Cookbook</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/nutrition"}
                  >
                    <Link
                      href="/nutrition"
                      data-testid="link-nutrition"
                      onClick={handleLinkClick}
                    >
                      <Apple className="w-4 h-4" />
                      <span className="flex-1">Nutrition</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/glossary"}
                  >
                    <Link
                      href="/glossary"
                      data-testid="link-glossary"
                      onClick={handleLinkClick}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span className="flex-1">Cooking Terms</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/smart-search"}
                  >
                    <Link
                      href="/smart-search"
                      data-testid="link-smart-search"
                      onClick={handleLinkClick}
                    >
                      <Brain className="w-4 h-4" />
                      <span className="flex-1">Smart Search</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/extraction"}
                  >
                    <Link
                      href="/extraction"
                      data-testid="link-extraction"
                      onClick={handleLinkClick}
                    >
                      <FileSearch className="w-4 h-4" />
                      <span className="flex-1">Data Extraction</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/pricing"}>
                    <Link
                      href="/pricing"
                      data-testid="link-pricing"
                      onClick={handleLinkClick}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span className="flex-1">Dynamic Pricing</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/images"}>
                    <Link
                      href="/images"
                      data-testid="link-images"
                      onClick={handleLinkClick}
                    >
                      <Image className="w-4 h-4" />
                      <span className="flex-1">Image Enhancement</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              AI Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/writing-assistant"}>
                    <Link
                      href="/writing-assistant"
                      data-testid="link-writing-assistant"
                      onClick={handleLinkClick}
                    >
                      <Pen className="w-4 h-4" />
                      <span className="flex-1">Writing Assistant</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/summarization"}>
                    <Link
                      href="/summarization"
                      data-testid="link-summarization"
                      onClick={handleLinkClick}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="flex-1">Summarization</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/ocr"}>
                    <Link
                      href="/ocr"
                      data-testid="link-ocr"
                      onClick={handleLinkClick}
                    >
                      <ScanLine className="w-4 h-4" />
                      <span className="flex-1">OCR</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/transcriptions"}>
                    <Link
                      href="/transcriptions"
                      data-testid="link-transcriptions"
                      onClick={handleLinkClick}
                    >
                      <Mic className="w-4 h-4" />
                      <span className="flex-1">Transcriptions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/recommendations-demo"}>
                    <Link
                      href="/recommendations-demo"
                      data-testid="link-recommendations"
                      onClick={handleLinkClick}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="flex-1">Recommendations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/translation-demo"}>
                    <Link
                      href="/translation-demo"
                      data-testid="link-translation"
                      onClick={handleLinkClick}
                    >
                      <Languages className="w-4 h-4" />
                      <span className="flex-1">Translation</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/excerpt-generator"}>
                    <Link
                      href="/excerpt-generator"
                      data-testid="link-excerpt-generator"
                      onClick={handleLinkClick}
                    >
                      <FileEdit className="w-4 h-4" />
                      <span className="flex-1">Excerpt Generator</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Media
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/face-detection"}>
                    <Link
                      href="/face-detection"
                      data-testid="link-face-detection"
                      onClick={handleLinkClick}
                    >
                      <Camera className="w-4 h-4" />
                      <span className="flex-1">Face Detection</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/alt-text"}>
                    <Link
                      href="/alt-text"
                      data-testid="link-alt-text"
                      onClick={handleLinkClick}
                    >
                      <ImagePlus className="w-4 h-4" />
                      <span className="flex-1">Alt Text Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Inventory
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/appliances"}
                  >
                    <Link
                      href="/appliances"
                      data-testid="link-appliances"
                      onClick={handleLinkClick}
                    >
                      <ChefHat className="w-4 h-4" />
                      <span className="flex-1">My Kitchen Appliances</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Collapsible
                  open={foodGroupsOpen}
                  onOpenChange={setFoodGroupsOpen}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton data-testid="button-toggle-food-groups">
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 transition-transform",
                            foodGroupsOpen && "rotate-90",
                          )}
                        />
                        <span className="flex-1">Food Groups</span>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs rounded-full h-5 px-2"
                          data-testid="badge-count-categories"
                        >
                          {foodCategories.length}
                        </Badge>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/food-groups"}
                          >
                            <Link
                              href="/food-groups"
                              data-testid="link-food-groups-all"
                              onClick={handleLinkClick}
                            >
                              <LayoutGrid className="w-4 h-4" />
                              <span className="flex-1">
                                View All Categories
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {foodCategories.map((category) => {
                          const categoryItems = groupedItems[category];
                          const categoryPath = `/food-groups/${category.toLowerCase()}`;
                          const CategoryIcon = getCategoryIcon(category);
                          const displayName = shortenCategoryName(category);
                          return (
                            <SidebarMenuSubItem key={category}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location === categoryPath}
                              >
                                <Link
                                  href={categoryPath}
                                  data-testid={`link-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                                  onClick={handleLinkClick}
                                >
                                  <CategoryIcon className="w-4 h-4" />
                                  <span className="flex-1">{displayName}</span>
                                  <Badge
                                    variant="secondary"
                                    className="ml-auto text-xs rounded-full h-5 px-2"
                                    data-testid={`badge-category-count-${category.toLowerCase().replace(/\s+/g, "-")}`}
                                  >
                                    {categoryItems.length}
                                  </Badge>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <Collapsible
                  open={inventoryOpen}
                  onOpenChange={setInventoryOpen}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton data-testid="button-toggle-storage">
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 transition-transform",
                            inventoryOpen && "rotate-90",
                          )}
                        />
                        <span className="flex-1">All Items</span>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs rounded-full h-5 px-2"
                          data-testid="badge-count-all"
                        >
                          {totalItems}
                        </Badge>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/storage/all"}
                          >
                            <Link
                              href="/storage/all"
                              data-testid="link-storage-all"
                              onClick={handleLinkClick}
                            >
                              <Home className="w-4 h-4" />
                              <span className="flex-1">View All</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {storageLocations?.map((loc: StorageLocation) => {
                          const IconComponent =
                            iconMap[loc.icon] || UtensilsCrossed;
                          const locCount =
                            foodItems?.filter(
                              (item) => item.storageLocationId === loc.id,
                            ).length || 0;
                          return (
                            <SidebarMenuSubItem key={loc.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  location ===
                                  `/storage/${loc.name.toLowerCase()}`
                                }
                              >
                                <Link
                                  href={`/storage/${loc.name.toLowerCase()}`}
                                  data-testid={`link-storage-${loc.id}`}
                                  onClick={handleLinkClick}
                                >
                                  <IconComponent className="w-4 h-4" />
                                  <span className="flex-1">{loc.name}</span>
                                  <Badge
                                    variant="secondary"
                                    className="ml-auto text-xs rounded-full h-5 px-2"
                                    data-testid={`badge-count-${loc.id}`}
                                  >
                                    {locCount}
                                  </Badge>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/notifications"}>
                    <Link
                      href="/notifications"
                      data-testid="link-notifications"
                      onClick={handleLinkClick}
                    >
                      <Bell className="w-4 h-4" />
                      <span className="flex-1">Notifications</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/orders"}>
                    <Link
                      href="/orders"
                      data-testid="link-orders"
                      onClick={handleLinkClick}
                    >
                      <Package className="w-4 h-4" />
                      <span className="flex-1">Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/drafts"}>
                    <Link
                      href="/drafts"
                      data-testid="link-drafts"
                      onClick={handleLinkClick}
                    >
                      <FileEdit className="w-4 h-4" />
                      <span className="flex-1">Drafts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/feedback"}
                  >
                    <Link
                      href="/feedback"
                      data-testid="link-feedback"
                      onClick={handleLinkClick}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="flex-1">Feedback</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/donate"}>
                    <Link
                      href="/donate"
                      data-testid="link-donate"
                      onClick={handleLinkClick}
                    >
                      <Heart className="w-4 h-4" />
                      <span className="flex-1">Support Us</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/settings"}
                  >
                    <Link
                      href="/settings"
                      data-testid="link-settings"
                      onClick={handleLinkClick}
                    >
                      <Settings className="w-4 h-4" />
                      <span className="flex-1">Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {user?.isAdmin && (
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/admin-dashboard"}
                    >
                      <Link
                        href="/admin-dashboard"
                        data-testid="link-admin-dashboard"
                        onClick={handleLinkClick}
                      >
                        <Shield className="w-4 h-4" />
                        <span className="flex-1">Admin Dashboard</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/analytics-dashboard"}
                    >
                      <Link
                        href="/analytics-dashboard"
                        data-testid="link-analytics-dashboard"
                        onClick={handleLinkClick}
                      >
                        <Activity className="w-4 h-4" />
                        <span className="flex-1">Analytics</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/ab-testing"}
                    >
                      <Link
                        href="/ab-testing"
                        data-testid="link-ab-testing"
                        onClick={handleLinkClick}
                      >
                        <Beaker className="w-4 h-4" />
                        <span className="flex-1">A/B Testing</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/fraud-dashboard"}
                    >
                      <Link
                        href="/fraud-dashboard"
                        data-testid="link-fraud-dashboard"
                        onClick={handleLinkClick}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="flex-1">Fraud Detection</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/moderation"}
                    >
                      <Link
                        href="/moderation"
                        data-testid="link-moderation"
                        onClick={handleLinkClick}
                      >
                        <Shield className="w-4 h-4" />
                        <span className="flex-1">Moderation</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/sentiment-dashboard"}
                    >
                      <Link
                        href="/sentiment-dashboard"
                        data-testid="link-sentiment-dashboard"
                        onClick={handleLinkClick}
                      >
                        <Smile className="w-4 h-4" />
                        <span className="flex-1">Sentiment</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/retention-dashboard"}
                    >
                      <Link
                        href="/retention-dashboard"
                        data-testid="link-retention-dashboard"
                        onClick={handleLinkClick}
                      >
                        <Users className="w-4 h-4" />
                        <span className="flex-1">Retention</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/trends-dashboard"}
                    >
                      <Link
                        href="/trends-dashboard"
                        data-testid="link-trends-dashboard"
                        onClick={handleLinkClick}
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span className="flex-1">Trends</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/cohort-analysis"}
                    >
                      <Link
                        href="/cohort-analysis"
                        data-testid="link-cohort-analysis"
                        onClick={handleLinkClick}
                      >
                        <PieChart className="w-4 h-4" />
                        <span className="flex-1">Cohort Analysis</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/system-health"}
                    >
                      <Link
                        href="/system-health"
                        data-testid="link-system-health"
                        onClick={handleLinkClick}
                      >
                        <Server className="w-4 h-4" />
                        <span className="flex-1">System Health</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/scheduling"}
                    >
                      <Link
                        href="/scheduling"
                        data-testid="link-scheduling"
                        onClick={handleLinkClick}
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="flex-1">Scheduling</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/ticket-routing"}
                    >
                      <Link
                        href="/ticket-routing"
                        data-testid="link-ticket-routing"
                        onClick={handleLinkClick}
                      >
                        <Headphones className="w-4 h-4" />
                        <span className="flex-1">Ticket Routing</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/cooking-terms-admin"}
                    >
                      <Link
                        href="/cooking-terms-admin"
                        data-testid="link-cooking-terms-admin"
                        onClick={handleLinkClick}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="flex-1">Cooking Terms</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/feedback-analytics"}
                    >
                      <Link
                        href="/feedback-analytics"
                        data-testid="link-feedback-analytics"
                        onClick={handleLinkClick}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="flex-1">Feedback Analytics</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/query-builder"}
                    >
                      <Link
                        href="/query-builder"
                        data-testid="link-query-builder"
                        onClick={handleLinkClick}
                      >
                        <Search className="w-4 h-4" />
                        <span className="flex-1">Query Builder</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/semantic-search"}
                    >
                      <Link
                        href="/semantic-search"
                        data-testid="link-semantic-search"
                        onClick={handleLinkClick}
                      >
                        <Brain className="w-4 h-4" />
                        <span className="flex-1">Semantic Search</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Admin
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Demos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/ai-features"}>
                    <Link
                      href="/ai-features"
                      data-testid="link-ai-features"
                      onClick={handleLinkClick}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="flex-1">AI Features</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/summarization-demo"}>
                    <Link
                      href="/summarization-demo"
                      data-testid="link-summarization-demo"
                      onClick={handleLinkClick}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="flex-1">Summarization Demo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/tag-demo"}>
                    <Link
                      href="/tag-demo"
                      data-testid="link-tag-demo"
                      onClick={handleLinkClick}
                    >
                      <Tag className="w-4 h-4" />
                      <span className="flex-1">Tag Demo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/form-completion-demo"}>
                    <Link
                      href="/form-completion-demo"
                      data-testid="link-form-completion-demo"
                      onClick={handleLinkClick}
                    >
                      <FormInput className="w-4 h-4" />
                      <span className="flex-1">Form Completion Demo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/validation-demo"}>
                    <Link
                      href="/validation-demo"
                      data-testid="link-validation-demo"
                      onClick={handleLinkClick}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="flex-1">Validation Demo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/moderation-test"}>
                    <Link
                      href="/moderation-test"
                      data-testid="link-moderation-test"
                      onClick={handleLinkClick}
                    >
                      <Shield className="w-4 h-4" />
                      <span className="flex-1">Moderation Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/camera-test"}>
                    <Link
                      href="/camera-test"
                      data-testid="link-camera-test"
                      onClick={handleLinkClick}
                    >
                      <Video className="w-4 h-4" />
                      <span className="flex-1">Camera Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Legal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/about"}>
                    <Link
                      href="/about"
                      data-testid="link-about"
                      onClick={handleLinkClick}
                    >
                      <Info className="w-4 h-4" />
                      <span className="flex-1">About</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/privacy"}>
                    <Link
                      href="/privacy"
                      data-testid="link-privacy"
                      onClick={handleLinkClick}
                    >
                      <Shield className="w-4 h-4" />
                      <span className="flex-1">Privacy Policy</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/terms"}>
                    <Link
                      href="/terms"
                      data-testid="link-terms"
                      onClick={handleLinkClick}
                    >
                      <ScrollText className="w-4 h-4" />
                      <span className="flex-1">Terms of Service</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                CacheStorage.clear();
                await fetch(API_ENDPOINTS.auth.logout, {
                  method: "POST",
                  credentials: "include",
                });
                window.location.href = "/";
              }}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
