import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3,
  Save,
  X,
  RefreshCw,
  TrendingUp,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ExtractedDataItem {
  id: string;
  sourceId: string;
  sourceType: string;
  inputText: string;
  extractedFields: Record<string, any>;
  confidence: number;
  fieldConfidence?: Record<string, number>;
  validationStatus: 'pending' | 'validated' | 'corrected' | 'rejected';
  corrections?: Record<string, any>;
  validatedBy?: string;
  createdAt: string;
}

interface DataValidatorProps {
  className?: string;
}

export function DataValidator({ className }: DataValidatorProps) {
  const [selectedItem, setSelectedItem] = useState<ExtractedDataItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');

  // Fetch extraction history
  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['/api/extract/history', filterStatus, filterTemplate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('validationStatus', filterStatus);
      if (filterTemplate !== 'all') params.append('templateId', filterTemplate);
      params.append('limit', '50');
      
      const response = await apiRequest('GET', `/api/extract/history?${params}`);
      return response.json();
    }
  });

  // Fetch extraction stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/extract/stats']
  });

  // Validate extraction mutation
  const validateMutation = useMutation({
    mutationFn: async (extractionId: string) => {
      const response = await apiRequest('PUT', `/api/extract/verify/${extractionId}`, { validationStatus: 'validated' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extract/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extract/stats'] });
      setSelectedItem(null);
    }
  });

  // Correct extraction mutation
  const correctMutation = useMutation({
    mutationFn: async (data: { extractionId: string, corrections: Record<string, any> }) => {
      return apiRequest('/api/extract/correct', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extract/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extract/stats'] });
      setEditMode(false);
      setSelectedItem(null);
    }
  });

  // Start editing
  const startEditing = (item: ExtractedDataItem) => {
    setEditedFields(item.extractedFields);
    setEditMode(true);
  };

  // Save corrections
  const saveCorrections = () => {
    if (!selectedItem) return;
    
    correctMutation.mutate({
      extractionId: selectedItem.id,
      corrections: editedFields
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditMode(false);
    setEditedFields({});
  };

  // Update field value
  const updateFieldValue = (fieldName: string, value: any) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Validated</Badge>;
      case 'corrected':
        return <Badge variant="default" className="bg-blue-600"><Edit3 className="w-3 h-3 mr-1" />Corrected</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const extractions = historyData?.data || [];
  const stats = statsData?.stats || {
    total: 0,
    validated: 0,
    pending: 0,
    corrected: 0,
    averageConfidence: 0
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", className)}>
      {/* Stats Overview */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Extractions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Validated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.validated}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Confidence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getConfidenceColor(stats.averageConfidence))}>
                {(stats.averageConfidence * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extraction List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Extraction History</CardTitle>
          <CardDescription>Review and validate extracted data</CardDescription>
          
          {/* Filters */}
          <div className="space-y-2 mt-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="corrected">Corrected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading extractions...
                </div>
              ) : extractions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No extractions found
                </div>
              ) : (
                extractions.map((item: ExtractedDataItem) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedItem?.id === item.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                    )}
                    onClick={() => setSelectedItem(item)}
                    data-testid={`extraction-${item.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">
                          {item.sourceId}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {item.sourceType} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.validationStatus)}
                          <Badge variant="outline" className="text-xs">
                            {(item.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="w-full"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detail View */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Extraction Details</CardTitle>
            {selectedItem && !editMode && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => validateMutation.mutate(selectedItem.id)}
                  disabled={selectedItem.validationStatus === 'validated'}
                  data-testid="button-validate"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Validate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(selectedItem)}
                  data-testid="button-edit"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
            {editMode && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={saveCorrections}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEditing}
                  data-testid="button-cancel"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {!selectedItem ? (
            <div className="text-center py-16 text-muted-foreground">
              Select an extraction to view details
            </div>
          ) : (
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields" data-testid="tab-fields">Extracted Fields</TabsTrigger>
                <TabsTrigger value="source" data-testid="tab-source">Source Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fields" className="space-y-3">
                {editMode ? (
                  // Edit mode
                  <div className="space-y-3">
                    {Object.entries(editedFields).map(([fieldName, value]) => (
                      <div key={fieldName} className="space-y-2">
                        <Label>{fieldName}</Label>
                        <Input
                          value={value || ''}
                          onChange={(e) => updateFieldValue(fieldName, e.target.value)}
                          data-testid={`edit-field-${fieldName}`}
                        />
                        {selectedItem.fieldConfidence?.[fieldName] && (
                          <span className={cn("text-xs", getConfidenceColor(selectedItem.fieldConfidence[fieldName]))}>
                            Original confidence: {(selectedItem.fieldConfidence[fieldName] * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // View mode
                  <div className="space-y-3">
                    {Object.entries(selectedItem.extractedFields).map(([fieldName, value]) => (
                      <div key={fieldName} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm">{fieldName}</Label>
                          {selectedItem.fieldConfidence?.[fieldName] && (
                            <span className={cn("text-xs", getConfidenceColor(selectedItem.fieldConfidence[fieldName]))}>
                              {(selectedItem.fieldConfidence[fieldName] * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          {Array.isArray(value) ? (
                            <ul className="list-disc list-inside">
                              {value.map((item, i) => (
                                <li key={i}>{JSON.stringify(item)}</li>
                              ))}
                            </ul>
                          ) : typeof value === 'object' ? (
                            <pre className="text-xs bg-muted p-2 rounded">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            value || <span className="text-muted-foreground italic">Empty</span>
                          )}
                        </div>
                        
                        {selectedItem.corrections?.[fieldName] && (
                          <Alert className="mt-2">
                            <AlertDescription className="text-xs">
                              Corrected from: {selectedItem.corrections[fieldName]}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="source">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="text-sm whitespace-pre-wrap">
                    {selectedItem.inputText}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}