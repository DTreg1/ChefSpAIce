import { toast } from "@/hooks/use-toast";
import { CookLoader } from "@/components/loaders";
import { ToastAction } from "@/components/ui/toast";
import { ReactNode } from "react";

interface LoadingToastOptions {
  title: string;
  description?: ReactNode;
  text?: string;
}

interface NavigationToastOptions {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
}

// Create a loading toast with CookLoader animation
export function toastWithLoader({
  title,
  description,
  text = "Processing...",
}: LoadingToastOptions) {
  const toastData = toast({
    title,
    description: description || (
      <div className="flex items-center gap-3">
        <CookLoader size="xs" color="primary" />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    ),
    duration: Infinity, // Don't auto-dismiss loading toasts
  });

  // Add update method for progress updates
  const updateProgress = (newText: string) => {
    toastData.update({
      id: toastData.id,
      title,
      description: (
        <div className="flex items-center gap-3">
          <CookLoader size="xs" color="primary" />
          <span className="text-sm text-muted-foreground">{newText}</span>
        </div>
      ),
    });
  };

  // Add complete method to finish with navigation option
  const complete = (options: NavigationToastOptions) => {
    const variantClasses = {
      default: "",
      destructive: "destructive",
      success: "border-success bg-success/10 text-success-foreground",
      warning: "border-warning bg-warning/10 text-warning-foreground",
    };

    toastData.update({
      id: toastData.id,
      title: options.title,
      description: options.description,
      className: variantClasses[options.variant || "default"],
      action: options.action ? (
        <ToastAction
          altText={options.action.label}
          onClick={options.action.onClick}
        >
          {options.action.label}
        </ToastAction>
      ) : undefined,
      duration: options.duration || 5000,
    });
  };

  return {
    id: toastData.id,
    dismiss: toastData.dismiss,
    updateProgress,
    complete,
  };
}

// Navigation toast helper for common patterns
export function toastWithNavigation(options: NavigationToastOptions) {
  const variantClasses = {
    default: "",
    destructive: "destructive",
    success: "border-success bg-success/10",
    warning: "border-warning bg-warning/10",
  };

  return toast({
    title: options.title,
    description: options.description,
    className: variantClasses[options.variant || "default"],
    action: options.action ? (
      <ToastAction
        altText={options.action.label}
        onClick={options.action.onClick}
      >
        {options.action.label}
      </ToastAction>
    ) : undefined,
    duration: options.duration || 5000,
  });
}

// Common toast patterns for ChefSpAIce
export const chefToasts = {
  // Expiring items notification
  expiringItems: (count: number, navigate: () => void) => {
    toastWithNavigation({
      title: "Items Expiring Soon",
      description: `${count} item${count > 1 ? "s" : ""} will expire in the next few days`,
      variant: "warning",
      action: {
        label: "View Items",
        onClick: navigate,
      },
    });
  },

  // Recipe saved notification
  recipeSaved: (recipeName: string, navigate: () => void) => {
    toastWithNavigation({
      title: "Recipe Saved!",
      description: `"${recipeName}" has been added to your collection`,
      variant: "success",
      action: {
        label: "View Recipe",
        onClick: navigate,
      },
    });
  },

  // Shopping list update
  shoppingListUpdated: (itemCount: number, navigate: () => void) => {
    toastWithNavigation({
      title: "Shopping List Updated",
      description: `${itemCount} item${itemCount > 1 ? "s" : ""} added to your shopping list`,
      variant: "default",
      action: {
        label: "View List",
        onClick: navigate,
      },
    });
  },

  // Meal plan generation
  mealPlanInProgress: () => {
    return toastWithLoader({
      title: "Generating Meal Plan",
      text: "Analyzing your preferences...",
    });
  },

  // Inventory scan
  scanningBarcode: () => {
    return toastWithLoader({
      title: "Scanning Barcode",
      text: "Looking up product information...",
    });
  },

  // Recipe generation
  generatingRecipe: () => {
    return toastWithLoader({
      title: "Creating Recipe",
      text: "Crafting something delicious...",
    });
  },

  // Sync in progress
  syncingData: () => {
    return toastWithLoader({
      title: "Syncing Data",
      text: "Updating your inventory...",
    });
  },

  // Error toast with retry
  error: (message: string, onRetry?: () => void) => {
    toastWithNavigation({
      title: "Error",
      description: message,
      variant: "destructive",
      action: onRetry
        ? {
            label: "Retry",
            onClick: onRetry,
          }
        : undefined,
    });
  },

  // Success toast
  success: (message: string) => {
    toastWithNavigation({
      title: "Success",
      description: message,
      variant: "success",
      duration: 3000,
    });
  },
};
