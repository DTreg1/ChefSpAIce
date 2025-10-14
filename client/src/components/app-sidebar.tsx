import { useState } from "react";
import { 
  Home, Refrigerator, Snowflake, Pizza, UtensilsCrossed, ChefHat, Plus, 
  MessageSquare, BookOpen, Apple, CalendarDays, ShoppingCart, Settings, 
  Database, LayoutGrid, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { AddFoodDialog } from "./add-food-dialog";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categoryIcons";
import type { StorageLocation, FoodItem } from "@shared/schema";

const iconMap: Record<string, any> = {
  refrigerator: Refrigerator,
  snowflake: Snowflake,
  pizza: Pizza,
  "utensils-crossed": UtensilsCrossed,
};

export function AppSidebar() {
  const [location] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [foodGroupsOpen, setFoodGroupsOpen] = useState(false);

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
  });

  const { data: foodItems } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const totalItems = foodItems?.length || 0;

  const chatItem = {
    id: "chat",
    name: "AI Chef Chat",
    icon: MessageSquare,
    path: "/",
  };

  // Group food items by category for the sidebar
  const groupedItems = (foodItems || []).reduce((acc, item) => {
    const category = item.foodCategory || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const foodCategories = Object.keys(groupedItems).sort();

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-spring">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-sidebar-foreground font-sans">AI Chef</h1>
              <p className="text-xs text-muted-foreground">Your Kitchen Assistant</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === chatItem.path}>
                    <Link href={chatItem.path} data-testid="link-chat">
                      <chatItem.icon className="w-4 h-4" />
                      <span className="flex-1">{chatItem.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Planning
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/meal-planner"}>
                    <Link href="/meal-planner" data-testid="link-meal-planner">
                      <CalendarDays className="w-4 h-4" />
                      <span className="flex-1">Meal Planner</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/shopping-list"}>
                    <Link href="/shopping-list" data-testid="link-shopping-list">
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
                  <SidebarMenuButton asChild isActive={location === "/cookbook"}>
                    <Link href="/cookbook" data-testid="link-cookbook">
                      <BookOpen className="w-4 h-4" />
                      <span className="flex-1">My Cookbook</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/nutrition"}>
                    <Link href="/nutrition" data-testid="link-nutrition">
                      <Apple className="w-4 h-4" />
                      <span className="flex-1">Nutrition</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/fdc-search"}>
                    <Link href="/fdc-search" data-testid="link-fdc-search">
                      <Database className="w-4 h-4" />
                      <span className="flex-1">Food Search</span>
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
                  <SidebarMenuButton asChild isActive={location === "/appliances"}>
                    <Link href="/appliances" data-testid="link-appliances">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span className="flex-1">My Appliances</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Collapsible open={foodGroupsOpen} onOpenChange={setFoodGroupsOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton data-testid="button-toggle-food-groups">
                        <ChevronRight className={cn("w-4 h-4 transition-transform", foodGroupsOpen && "rotate-90")} />
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
                          <SidebarMenuSubButton asChild isActive={location === "/food-groups"}>
                            <Link href="/food-groups" data-testid="link-food-groups-all">
                              <LayoutGrid className="w-4 h-4" />
                              <span className="flex-1">View All Categories</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {foodCategories.map((category) => {
                          const categoryItems = groupedItems[category];
                          const categoryPath = `/food-groups?category=${encodeURIComponent(category)}`;
                          const CategoryIcon = getCategoryIcon(category);
                          return (
                            <SidebarMenuSubItem key={category}>
                              <SidebarMenuSubButton asChild isActive={location.includes(`category=${encodeURIComponent(category)}`)}>
                                <Link href={categoryPath} data-testid={`link-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <CategoryIcon className="w-4 h-4" />
                                  <span className="flex-1">{category}</span>
                                  <Badge 
                                    variant="secondary" 
                                    className="ml-auto text-xs rounded-full h-5 px-2"
                                    data-testid={`badge-category-count-${category.toLowerCase().replace(/\s+/g, '-')}`}
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
                <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton data-testid="button-toggle-storage">
                        <ChevronRight className={cn("w-4 h-4 transition-transform", inventoryOpen && "rotate-90")} />
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
                          <SidebarMenuSubButton asChild isActive={location === "/storage/all"}>
                            <Link href="/storage/all" data-testid="link-storage-all">
                              <Home className="w-4 h-4" />
                              <span className="flex-1">View All</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {storageLocations?.map((loc) => {
                          const IconComponent = iconMap[loc.icon] || UtensilsCrossed;
                          const locCount = foodItems?.filter(item => item.storageLocationId === loc.id).length || 0;
                          return (
                            <SidebarMenuSubItem key={loc.id}>
                              <SidebarMenuSubButton asChild isActive={location === `/storage/${loc.name.toLowerCase()}`}>
                                <Link href={`/storage/${loc.name.toLowerCase()}`} data-testid={`link-storage-${loc.id}`}>
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
                  <SidebarMenuButton asChild isActive={location === "/settings"}>
                    <Link href="/settings" data-testid="link-settings">
                      <Settings className="w-4 h-4" />
                      <span className="flex-1">Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-6">
            <Button 
              className="w-full transition-morph glass-morph" 
              size="default"
              onClick={() => setAddDialogOpen(true)}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Food Item
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>

      <AddFoodDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}
