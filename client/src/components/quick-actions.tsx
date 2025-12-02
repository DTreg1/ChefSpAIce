import { HelpCircle, Lightbulb, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

const actions = [
  {
    id: "help",
    icon: HelpCircle,
    label: "How can I help?",
    prompt:
      "What features does this app have and how can I use them effectively?",
  },
  {
    id: "suggestions",
    icon: Lightbulb,
    label: "Get suggestions",
    prompt:
      "Can you suggest some recipes based on what I have in my inventory?",
  },
  {
    id: "learn",
    icon: BookOpen,
    label: "Learn cooking tips",
    prompt: "Give me some useful cooking tips and techniques",
  },
  {
    id: "settings",
    icon: Settings,
    label: "App guidance",
    prompt: "How do I customize my preferences and settings in this app?",
  },
];

export function QuickActions({ onActionClick }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto flex-col gap-2 py-3"
              onClick={() => onActionClick(action.prompt)}
              data-testid={`button-quick-action-${action.id}`}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-xs text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
