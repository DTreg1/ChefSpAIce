import { useState } from "react";
import { Home, Refrigerator, Snowflake, Pizza, UtensilsCrossed, ChefHat, Plus, MessageSquare, BookOpen, Apple, CalendarDays, ShoppingCart, Settings, Database } from "lucide-react";
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { AddFoodDialog } from "./add-food-dialog";
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

  const storageItems = [
    { 
      id: "all", 
      name: "All Items", 
      icon: Home, 
      count: totalItems, 
      path: "/storage/all" 
    },
    ...(storageLocations?.map((loc) => ({
      id: loc.id,
      name: loc.name,
      icon: iconMap[loc.icon] || UtensilsCrossed,
      count: loc.itemCount,
      path: `/storage/${loc.name.toLowerCase()}`,
    })) || []),
  ];

  return (
    <>
      <Sidebar className="bg-sidebar/90 backdrop-blur-sm">
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
                      <span className="flex-1">FDC Search</span>
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
                {storageItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={location === item.path}>
                      <Link href={item.path} data-testid={`link-storage-${item.id}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.name}</span>
                        <Badge 
                          variant="secondary" 
                          className="ml-auto text-xs rounded-full h-5 px-2"
                          data-testid={`badge-count-${item.id}`}
                        >
                          {item.count}
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
