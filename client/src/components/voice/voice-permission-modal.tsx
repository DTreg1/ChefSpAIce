import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Shield } from "lucide-react";

interface VoicePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onDeny: () => void;
}

export function VoicePermissionModal({
  open,
  onOpenChange,
  onAllow,
  onDeny,
}: VoicePermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-voice-permission">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Enable Voice Commands
          </DialogTitle>
          <DialogDescription className="pt-2">
            <div className="flex items-start gap-2 mb-4">
              <Shield className="h-4 w-4 mt-1 text-muted-foreground" />
              <div className="text-sm">
                This app needs access to your microphone to use voice commands.
                Your audio is processed securely and never stored permanently.
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-2">
                Available voice commands:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• "Show me my recent orders"</li>
                <li>• "Add milk to shopping list"</li>
                <li>• "Search for chicken recipes"</li>
                <li>• "Show expiring items"</li>
                <li>• "Navigate to meal plans"</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onDeny}
            data-testid="button-deny-voice"
          >
            Not Now
          </Button>
          <Button onClick={onAllow} data-testid="button-allow-voice">
            <Mic className="h-4 w-4 mr-2" />
            Allow Microphone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
