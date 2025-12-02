import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true,
) {
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        // Allow Escape to work everywhere
        if (e.key !== "Escape") {
          return;
        }
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const matchesModifiers =
          ((!shortcut.ctrl && !shortcut.cmd) ||
            (shortcut.ctrl && e.ctrlKey) ||
            (shortcut.cmd && e.metaKey)) &&
          (!shortcut.shift || e.shiftKey) &&
          (!shortcut.alt || e.altKey);

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          matchesModifiers
        ) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Global keyboard shortcuts hook
export function useGlobalKeyboardShortcuts() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: "1",
      cmd: true,
      action: () => setLocation("/"),
      description: "Go to Chat",
    },
    {
      key: "2",
      cmd: true,
      action: () => setLocation("/storage/all"),
      description: "Go to Storage",
    },
    {
      key: "3",
      cmd: true,
      action: () => setLocation("/cookbook"),
      description: "Go to Cookbook",
    },
    {
      key: "4",
      cmd: true,
      action: () => setLocation("/meal-planner"),
      description: "Go to Meal Planner",
    },
    {
      key: "5",
      cmd: true,
      action: () => setLocation("/shopping-list"),
      description: "Go to Shopping List",
    },
    // Action shortcuts
    {
      key: "n",
      cmd: true,
      action: () => {
        // Trigger add food dialog
        const event = new CustomEvent("openAddFoodDialog");
        document.dispatchEvent(event);
      },
      description: "Add New Food Item (⌘+N)",
    },
    {
      key: "r",
      cmd: true,
      action: () => {
        // Trigger smart recipe generation
        const event = new CustomEvent("generateSmartRecipe");
        document.dispatchEvent(event);
      },
      description: "Generate Smart Recipe (⌘+R)",
    },
    {
      key: "k",
      cmd: true,
      action: () => {
        // Open command palette (future feature)
        toast({
          title: "Command Palette",
          description: "Coming soon! Quick access to all features.",
        });
      },
      description: "Open Command Palette (⌘+K)",
    },
    {
      key: "/",
      cmd: true,
      action: () => {
        // Focus search
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-testid="input-search"]',
        );
        if (searchInput) {
          searchInput.focus();
        } else {
          // Navigate to chat and focus input
          setLocation("/");
          setTimeout(() => {
            const chatInput = document.querySelector<HTMLTextAreaElement>(
              '[data-testid="input-chat"]',
            );
            if (chatInput) {
              chatInput.focus();
            }
          }, 100);
        }
      },
      description: "Focus Search/Chat (⌘+/)",
    },
    {
      key: "?",
      shift: true,
      action: () => {
        // Show keyboard shortcuts help
        const shortcutsList = shortcuts
          .map((s) => `${s.description}`)
          .join("\n");
        toast({
          title: "⌨️ Keyboard Shortcuts",
          description: shortcutsList,
        });
      },
      description: "Show Keyboard Shortcuts (?)",
    },
    // Quick actions
    {
      key: "Escape",
      action: () => {
        // Close any open dialogs or clear selections
        const event = new CustomEvent("escapePressed");
        document.dispatchEvent(event);
      },
      description: "Close dialogs / Clear selection (Esc)",
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

// Hook for local component shortcuts
export function useLocalKeyboardShortcuts(
  componentShortcuts: KeyboardShortcut[],
  deps: any[] = [],
) {
  useKeyboardShortcuts(componentShortcuts, true);
}
