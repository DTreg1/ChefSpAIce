import { ChefHat, Refrigerator, UtensilsCrossed, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "chat" | "inventory";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === "chat") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in" data-testid="empty-state-chat">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-subtle">
          <ChefHat className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Welcome to AI Chef!</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Your personal kitchen assistant is here to help you manage your food inventory and discover amazing recipes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div className="p-4 border border-border rounded-xl hover-elevate card-hover shadow-sm">
            <MessageSquare className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm text-foreground font-medium mb-1">Try asking:</p>
            <p className="text-sm text-muted-foreground">"What can I make with chicken and rice?"</p>
          </div>
          <div className="p-4 border border-border rounded-xl hover-elevate card-hover shadow-sm">
            <Plus className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm text-foreground font-medium mb-1">Or say:</p>
            <p className="text-sm text-muted-foreground">"Add 2 pounds of chicken to my fridge"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in" data-testid="empty-state-inventory">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6 animate-pulse-subtle">
        <Refrigerator className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No items yet</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Start by adding food items to your inventory or ask your AI Chef to help you.
      </p>
      {onAction && (
        <Button onClick={onAction} className="scale-touch" data-testid="button-add-first-item">
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Item
        </Button>
      )}
    </div>
  );
}
