/**
 * Version History Component
 * 
 * Displays draft versions with options to preview and restore
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  History,
  Eye,
  RotateCcw,
  Trash2,
  ChevronDown,
  FileText,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VersionHistoryProps {
  documentId: string;
  currentContent: string;
  onRestore: (content: string) => void;
  className?: string;
}

interface DraftVersion {
  id: string;
  version: number;
  content: string;
  contentHash: string;
  savedAt: string;
  isAutoSave: boolean;
  conflictResolved: boolean;
  metadata?: {
    cursorPosition?: number;
    scrollPosition?: number;
    deviceInfo?: {
      browser?: string;
      os?: string;
      screenSize?: string;
    };
  };
}

export function VersionHistory({
  documentId,
  currentContent,
  onRestore,
  className,
}: VersionHistoryProps) {
  const { toast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<DraftVersion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);

  // Fetch version history
  const { data: versions, isLoading } = useQuery<{ versions: DraftVersion[] }>({
    queryKey: ['/api/autosave/versions', documentId],
    queryFn: () => apiRequest(`/api/autosave/versions?documentId=${documentId}&limit=20`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Delete version mutation
  const deleteVersionMutation = useMutation({
    mutationFn: async (draftId: string) =>
      apiRequest(`/api/autosave/draft/${draftId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/autosave/versions', documentId],
      });
      toast({
        title: 'Version deleted',
        description: 'The selected version has been deleted.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete version. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle version restoration
  const handleRestore = (version: DraftVersion) => {
    setSelectedVersion(version);
    setIsConfirmRestoreOpen(true);
  };

  const confirmRestore = () => {
    if (selectedVersion) {
      onRestore(selectedVersion.content);
      setIsConfirmRestoreOpen(false);
      toast({
        title: 'Version restored',
        description: `Restored version ${selectedVersion.version} from ${formatDistanceToNow(new Date(selectedVersion.savedAt))} ago`,
      });
    }
  };

  // Handle version preview
  const handlePreview = (version: DraftVersion) => {
    setSelectedVersion(version);
    setIsPreviewOpen(true);
  };

  // Calculate content diff summary
  const getChangeSummary = (version: DraftVersion) => {
    const versionLength = version.content.length;
    const currentLength = currentContent.length;
    const diff = versionLength - currentLength;
    
    if (diff > 0) {
      return `+${diff} chars`;
    } else if (diff < 0) {
      return `${diff} chars`;
    } else {
      return 'Same length';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const versionList = versions?.versions || [];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
            data-testid="button-version-history"
          >
            <History className="w-4 h-4" />
            <span>Version History</span>
            {versionList.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {versionList.length}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Version History</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-72">
            {versionList.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No versions saved yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {versionList.map((version, index) => (
                  <div
                    key={version.id}
                    className={cn(
                      'rounded-md p-2 hover:bg-accent transition-colors',
                      index === 0 && 'bg-accent/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            v{version.version}
                          </span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Latest
                            </Badge>
                          )}
                          {version.isAutoSave && (
                            <Badge variant="outline" className="text-xs">
                              Auto
                            </Badge>
                          )}
                          {version.conflictResolved && (
                            <Badge variant="destructive" className="text-xs">
                              Conflict
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(version.savedAt))} ago
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getChangeSummary(version)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handlePreview(version)}
                          data-testid={`button-preview-v${version.version}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRestore(version)}
                          data-testid={`button-restore-v${version.version}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        {versionList.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteVersionMutation.mutate(version.id)}
                            data-testid={`button-delete-v${version.version}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Version {selectedVersion?.version} Preview
            </DialogTitle>
            <DialogDescription>
              Saved {selectedVersion && formatDistanceToNow(new Date(selectedVersion.savedAt))} ago
              {selectedVersion?.metadata?.deviceInfo && (
                <span className="ml-2 text-xs">
                  • {selectedVersion.metadata.deviceInfo.screenSize}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 border rounded-md p-4 bg-muted/30">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {selectedVersion?.content}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                if (selectedVersion) {
                  handleRestore(selectedVersion);
                }
              }}
              data-testid="button-restore-from-preview"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <Dialog open={isConfirmRestoreOpen} onOpenChange={setIsConfirmRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version {selectedVersion?.version}?</DialogTitle>
            <DialogDescription>
              This will replace your current content with the version from{' '}
              {selectedVersion && formatDistanceToNow(new Date(selectedVersion.savedAt))} ago.
              Your current work will be saved as a new version before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRestore} data-testid="button-confirm-restore">
              <Check className="w-4 h-4 mr-2" />
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}