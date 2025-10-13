import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ChefHat,
  Plus,
  Refrigerator,
  BookOpen,
  Calendar,
  ShoppingCart,
  Settings,
  Home,
  Search,
  MessageSquare,
  Apple,
  UtensilsCrossed,
  ScanLine,
} from "lucide-react";

interface CommandPaletteProps {
  onAddFood?: () => void;
  onGenerateRecipe?: () => void;
  onScanBarcode?: () => void;
}

export function CommandPalette({ onAddFood, onGenerateRecipe, onScanBarcode }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((open) => !open);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navigate = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  const runAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runAction(() => onAddFood?.())}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add Food Item</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => onScanBarcode?.())}>
            <ScanLine className="mr-2 h-4 w-4" />
            <span>Scan Barcode</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => onGenerateRecipe?.())}>
            <ChefHat className="mr-2 h-4 w-4" />
            <span>Generate Recipe</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/storage/all")}>
            <Refrigerator className="mr-2 h-4 w-4" />
            <span>All Items</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/storage/fridge")}>
            <Refrigerator className="mr-2 h-4 w-4" />
            <span>Fridge</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/storage/freezer")}>
            <Refrigerator className="mr-2 h-4 w-4" />
            <span>Freezer</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/storage/pantry")}>
            <Refrigerator className="mr-2 h-4 w-4" />
            <span>Pantry</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/cookbook")}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Cookbook</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/meal-planner")}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Meal Planner</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/shopping-list")}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>Shopping List</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/nutrition")}>
            <Apple className="mr-2 h-4 w-4" />
            <span>Nutrition</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/appliances")}>
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            <span>Appliances</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Search">
          <CommandItem onSelect={() => navigate("/fdc-search")}>
            <Search className="mr-2 h-4 w-4" />
            <span>Search USDA Database</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}