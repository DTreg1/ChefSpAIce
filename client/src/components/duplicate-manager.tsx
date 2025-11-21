import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  FileText,
  MessageSquare,
  Package,
  Loader2,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DuplicateComparison } from "./duplicate-comparison";
import { SimilarityScore } from "./duplicate-warning-modal";
import { format } from "date-fns";

interface DuplicateStats {
  total: number;
  pending: number;
  confirmed: number;
  unique: number;
  merged: number;
  averageSimilarity: number;
}

interface DuplicatePair {
  id: string;
  contentId1: string;
  contentId2: string;
  contentType1: string;
  contentType2: string;
  similarityScore: number;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  content1?: any;
  content2?: any;
  createdAt: string;
}

export function DuplicateManager() {
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const { toast } = useToast();

  // Fetch duplicate statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DuplicateStats>({
    queryKey: ['/api/duplicates/stats'],
  });

  // Fetch pending duplicates
  const { data: pendingDuplicates, isLoading: duplicatesLoading, refetch } = useQuery<DuplicatePair[]>({
    queryKey: ['/api/duplicates/pending'],
  });

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: async (contentType: 'recipe' | 'chat' | 'inventory') => {
      setIsReindexing(true);
      return apiRequest('POST', '/api/duplicates/reindex', { 
        contentType, 
        limit: 50 
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Reindex Complete",
        description: `Successfully reindexed content for embeddings`,
      });
      setIsReindexing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/duplicates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reindex Failed",
        description: error.message || "Failed to reindex content",
        variant: "destructive",
      });
      setIsReindexing(false);
    },
  });

  // Resolve duplicate mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ 
      duplicatePairId, 
      status 
    }: { 
      duplicatePairId: string; 
      status: 'duplicate' | 'unique' | 'merged' 
    }) => {
      return apiRequest('POST', '/api/duplicates/resolve', { 
        duplicatePairId, 
        status 
      });
    },
    onSuccess: () => {
      toast({
        title: "Duplicate Resolved",
        description: "The duplicate status has been updated",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/duplicates/stats'] });
      setSelectedPair(null);
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message || "Failed to resolve duplicate",
        variant: "destructive",
      });
    },
  });

  const handleResolve = (status: 'duplicate' | 'unique' | 'merged') => {
    if (!selectedPair) return;
    resolveMutation.mutate({ 
      duplicatePairId: selectedPair.id, 
      status 
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'recipe':
        return <FileText className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'inventory':
        return <Package className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid="badge-status-pending">Pending Review</Badge>;
      case 'duplicate':
        return <Badge variant="destructive" data-testid="badge-status-duplicate">Confirmed Duplicate</Badge>;
      case 'unique':
        return <Badge variant="outline" data-testid="badge-status-unique">Marked Unique</Badge>;
      case 'merged':
        return <Badge variant="default" data-testid="badge-status-merged">Merged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Duplicate Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and resolve duplicate content across your application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={duplicatesLoading}
            data-testid="button-refresh-duplicates"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${duplicatesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => reindexMutation.mutate('recipe')}
            disabled={isReindexing}
            data-testid="button-reindex-content"
          >
            {isReindexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reindexing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Reindex Recipes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card data-testid="card-stat-total">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All detected duplicates
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-pending">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Pending Review
                {stats.pending > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pending}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Needs attention
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-confirmed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Confirmed
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.confirmed}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Verified duplicates
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-unique">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Unique
                <XCircle className="h-4 w-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.unique}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                False positives
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-similarity">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Avg Similarity
                <BarChart3 className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.averageSimilarity * 100)}%
              </div>
              <Progress 
                value={stats.averageSimilarity * 100} 
                className="h-2 mt-2"
                data-testid="progress-avg-similarity"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert for pending duplicates */}
      {stats && stats.pending > 0 && (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            You have <strong>{stats.pending}</strong> duplicate pairs pending review. 
            Review them below to maintain data quality.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="all">All Duplicates</TabsTrigger>
          <TabsTrigger value="comparison" disabled={!selectedPair}>
            Comparison View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {duplicatesLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingDuplicates && pendingDuplicates.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {pendingDuplicates.map((pair) => (
                  <Card 
                    key={pair.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedPair(pair)}
                    data-testid={`card-duplicate-pair-${pair.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getContentTypeIcon(pair.contentType1)}
                            Duplicate {pair.contentType1 === 'recipe' ? 'Recipe' : 'Content'}
                          </CardTitle>
                          <CardDescription>
                            {pair.content1?.title || 'Item 1'} vs {pair.content2?.title || 'Item 2'}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(pair.status)}
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(pair.createdAt), 'MMM d, h:mm a')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <SimilarityScore score={pair.similarityScore} />
                      <div className="flex items-center justify-between mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPair(pair);
                          }}
                          data-testid={`button-review-${pair.id}`}
                        >
                          Review & Resolve
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve('duplicate');
                            }}
                            data-testid={`button-mark-duplicate-${pair.id}`}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve('unique');
                            }}
                            data-testid={`button-mark-unique-${pair.id}`}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No pending duplicates to review. Great job keeping your content clean!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                All duplicates history will be shown here (implementation pending)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          {selectedPair && (
            <DuplicateComparison
              content1={selectedPair.content1}
              content2={selectedPair.content2}
              contentType={selectedPair.contentType1}
              similarity={selectedPair.similarityScore}
              onMerge={(keepId, mergeFromId) => {
                handleResolve('merged');
              }}
              onKeepBoth={() => handleResolve('unique')}
              onMarkUnique={() => handleResolve('unique')}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}