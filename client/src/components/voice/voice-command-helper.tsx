import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, ChevronRight, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandExample {
  command: string;
  description: string;
  example: string;
}

interface VoiceCommandHelperProps {
  className?: string;
  compact?: boolean;
  onTryCommand?: (command: string) => void;
}

export function VoiceCommandHelper({
  className,
  compact = false,
  onTryCommand,
}: VoiceCommandHelperProps) {
  const [commands, setCommands] = useState<CommandExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchAvailableCommands();
  }, []);

  const fetchAvailableCommands = async () => {
    try {
      const response = await fetch("/api/voice/commands", {
        credentials: "include",
      });
      const data = await response.json();
      setCommands(data);
    } catch (error) {
      console.error("Failed to fetch voice commands:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = {
    all: "All Commands",
    navigate: "Navigation",
    search: "Search",
    add: "Add Items",
    show: "Display Info",
    create: "Create New",
  };

  const filteredCommands =
    selectedCategory === "all"
      ? commands
      : commands.filter((cmd) => cmd.command === selectedCategory);

  if (compact) {
    return (
      <div
        className={cn("inline-flex items-center gap-2", className)}
        data-testid="voice-helper-compact"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Try saying: "Show me my recent orders" or "Add milk to shopping list"
        </span>
      </div>
    );
  }

  return (
    <Card className={cn(className)} data-testid="voice-command-helper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Commands
        </CardTitle>
        <CardDescription>Available voice commands you can use</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(categories).map(([key, label]) => (
            <Badge
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedCategory(key)}
              data-testid={`filter-${key}`}
            >
              {label}
            </Badge>
          ))}
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">
                Loading commands...
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No commands available
              </div>
            ) : (
              filteredCommands.map((cmd, index) => (
                <div
                  key={index}
                  className="group border rounded-lg p-3 hover-elevate transition-all"
                  data-testid={`command-${cmd.command}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {cmd.command}
                        </Badge>
                        <span className="text-sm font-medium">
                          {cmd.description}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        "{cmd.example}"
                      </p>
                    </div>
                    {onTryCommand && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onTryCommand(cmd.example)}
                        data-testid={`try-${cmd.command}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Commands are processed using AI, so you can
            use natural language variations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
