/**
 * Conflict Resolver Component
 * 
 * Helps users resolve conflicts between local and remote versions
 */

import { useState } from 'react';
import { GitBranch, FileText, ArrowRight, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  localContent: string;
  remoteContent: string;
  onResolve: (resolvedContent: string, strategy: ConflictResolutionStrategy) => void;
}

export type ConflictResolutionStrategy = 
  | 'keep-local'
  | 'keep-remote'
  | 'merge-both'
  | 'custom';

export function ConflictResolver({
  isOpen,
  onClose,
  localContent,
  remoteContent,
  onResolve,
}: ConflictResolverProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>('keep-local');
  const [customContent, setCustomContent] = useState('');
  const [activeTab, setActiveTab] = useState('compare');

  // Calculate differences
  const localWords = localContent.split(/\s+/).length;
  const remoteWords = remoteContent.split(/\s+/).length;
  const localChars = localContent.length;
  const remoteChars = remoteContent.length;

  // Generate merged content
  const getMergedContent = (): string => {
    switch (selectedStrategy) {
      case 'keep-local':
        return localContent;
      case 'keep-remote':
        return remoteContent;
      case 'merge-both':
        // Simple merge strategy - append remote after local with separator
        return `${localContent}\n\n--- Merged Content ---\n\n${remoteContent}`;
      case 'custom':
        return customContent || localContent;
      default:
        return localContent;
    }
  };

  const handleResolve = () => {
    const resolvedContent = getMergedContent();
    onResolve(resolvedContent, selectedStrategy);
    onClose();
  };

  const handleCancel = () => {
    // Default to keeping local changes if cancelled
    onResolve(localContent, 'keep-local');
    onClose();
  };

  // Find common lines for diff display
  const getSimpleDiff = () => {
    const localLines = localContent.split('\n');
    const remoteLines = remoteContent.split('\n');
    const maxLines = Math.max(localLines.length, remoteLines.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i] || '';
      const remoteLine = remoteLines[i] || '';
      
      if (localLine === remoteLine) {
        diff.push({ type: 'same', content: localLine });
      } else {
        if (localLine) {
          diff.push({ type: 'local', content: localLine });
        }
        if (remoteLine) {
          diff.push({ type: 'remote', content: remoteLine });
        }
      }
    }
    
    return diff;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Resolve Content Conflict
          </DialogTitle>
          <DialogDescription>
            Another version of this document was saved while you were editing.
            Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compare">Compare Versions</TabsTrigger>
            <TabsTrigger value="resolution">Resolution Strategy</TabsTrigger>
            <TabsTrigger value="preview">Preview Result</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Local Version */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Your Version (Local)</Label>
                  <div className="flex gap-2">
                    <Badge variant="outline">{localWords} words</Badge>
                    <Badge variant="outline">{localChars} chars</Badge>
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-md p-3 bg-muted/30">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {localContent}
                  </pre>
                </ScrollArea>
              </div>

              {/* Remote Version */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Saved Version (Remote)</Label>
                  <div className="flex gap-2">
                    <Badge variant="outline">{remoteWords} words</Badge>
                    <Badge variant="outline">{remoteChars} chars</Badge>
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-md p-3 bg-muted/30">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {remoteContent}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            {/* Simple Diff View */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Differences</Label>
              <ScrollArea className="h-32 border rounded-md p-3 bg-muted/30">
                <div className="space-y-1 font-mono text-sm">
                  {getSimpleDiff().slice(0, 20).map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        'px-2 py-0.5 rounded',
                        line.type === 'local' && 'bg-green-500/20 text-green-700 dark:text-green-300',
                        line.type === 'remote' && 'bg-red-500/20 text-red-700 dark:text-red-300',
                        line.type === 'same' && 'opacity-60'
                      )}
                    >
                      {line.type === 'local' && '+ '}
                      {line.type === 'remote' && '- '}
                      {line.content || <span className="opacity-30">(empty line)</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="resolution" className="space-y-4 mt-4">
            <RadioGroup
              value={selectedStrategy}
              onValueChange={(value) => setSelectedStrategy(value as ConflictResolutionStrategy)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="keep-local" id="keep-local" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="keep-local" className="cursor-pointer">
                    <div className="font-medium">Keep Your Changes</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Discard the remote version and keep all your local edits
                    </div>
                  </Label>
                </div>
                <Badge variant="secondary">Recommended</Badge>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="keep-remote" id="keep-remote" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="keep-remote" className="cursor-pointer">
                    <div className="font-medium">Use Saved Version</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Discard your local changes and use the saved version
                    </div>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="merge-both" id="merge-both" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="merge-both" className="cursor-pointer">
                    <div className="font-medium">Merge Both Versions</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Combine both versions with a separator (you can edit later)
                    </div>
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="custom" id="custom" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="custom" className="cursor-pointer">
                    <div className="font-medium">Custom Resolution</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Manually edit and combine the content
                    </div>
                  </Label>
                </div>
                <Badge variant="outline">Advanced</Badge>
              </div>
            </RadioGroup>

            {selectedStrategy === 'custom' && (
              <div className="space-y-2">
                <Label>Edit Merged Content</Label>
                <textarea
                  className="w-full h-48 p-3 border rounded-md bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={customContent || localContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Edit the merged content here..."
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Final Result</Label>
                <Badge>{selectedStrategy.replace('-', ' ')}</Badge>
              </div>
              <ScrollArea className="h-96 border rounded-md p-4 bg-muted/30">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {getMergedContent()}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel-conflict"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel (Keep Local)
          </Button>
          <Button
            onClick={handleResolve}
            disabled={selectedStrategy === 'custom' && !customContent}
            data-testid="button-resolve-conflict"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}