import { useState, useEffect } from "react";
import {
  Home,
  Refrigerator,
  Snowflake,
  Pizza,
  UtensilsCrossed,
  ChefHat,
  MessageSquare,
  BookOpen,
  Apple,
  CalendarDays,
  ShoppingCart,
  Settings,
  Database,
  LayoutGrid,
  ChevronRight,
  BarChart3,
  Heart,
  Info,
  Shield,
  ScrollText,
  LogOut,
  BrainCircuit,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { CacheStorage } from "@/lib/cacheStorage";
import { queryClient } from "@/lib/queryClient";
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
  SidebarHeader,
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
import { Logo } from "@/components/Logo";
import type { StorageLocation, FoodItem } from "@shared/schema";

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
    queryClient.invalidateQueries({ queryKey: ['/api/storage-locations'] });
  }, []);

  const { data: storageLocations, refetch: refetchStorageLocations } = useStorageLocations();

  const { data: foodItems } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const totalItems = foodItems?.length || 0;

  const chatItem = {
    id: "chat",
    name: "Chef Chat",
    icon: MessageSquare,
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
                    isActive={location === chatItem.path}
                    className="transition-morph hover:pl-1"
                  >
                    <Link
                      href={chatItem.path}
                      data-testid="link-chat"
                      onClick={handleLinkClick}
                    >
                      <chatItem.icon className="w-4 h-4 transition-morph" />
                      <span className="flex-1">{chatItem.name}</span>
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
                      <UtensilsCrossed className="w-4 h-4" />
                      <span className="flex-1">My Appliances</span>
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
                        {storageLocations?.map((loc) => {
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/analytics"}
                  >
                    <Link
                      href="/analytics"
                      data-testid="link-analytics"
                      onClick={handleLinkClick}
                    >
                      <Activity className="w-4 h-4" />
                      <span className="flex-1">Analytics</span>
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
              onClick={() => {
                CacheStorage.clear();
                window.location.href = "/api/logout";
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
