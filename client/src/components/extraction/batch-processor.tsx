import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ExtractionTemplate } from '@shared/schema';
import pLimit from 'p-limit';

interface BatchItem {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  confidence?: number;
}

interface BatchProcessorProps {
  templates: ExtractionTemplate[];
  onComplete?: (results: any[]) => void;
  className?: string;
}

export function BatchProcessor({ 
  templates, 
  onComplete,
  className 
}: BatchProcessorProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [delimiter, setDelimiter] = useState('---');
  
  // Concurrency limit for parallel processing
  const CONCURRENCY_LIMIT = 3;
  const BATCH_SIZE = 5;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single item extraction mutation
  const extractItemMutation = useMutation({
    mutationFn: async (data: { text: string, templateId: string, itemId: string }) => {
      const result = await apiRequest('/api/extract', 'POST', {
        text: data.text,
        templateId: data.templateId
      });
      return { ...result, itemId: data.itemId };
    }
  });

  // Parse input text into batch items
  const parseTextInput = useCallback(() => {
    if (!textInput.trim()) return;
    
    const texts = textInput.split(new RegExp(`\\n?${delimiter}\\n?`))
      .map(text => text.trim())
      .filter(text => text.length > 0);
    
    const items: BatchItem[] = texts.map((text, index) => ({
      id: `item_${Date.now()}_${index}`,
      text,
      status: 'pending'
    }));
    
    setBatchItems(items);
    setTextInput('');
  }, [textInput, delimiter]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTextInput(content);
    };
    reader.readAsText(file);
  };

  // Start batch processing with limited concurrency
  const startProcessing = async () => {
    if (!selectedTemplate || batchItems.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    // Mark all items as pending initially
    setBatchItems(prev => prev.map(item => ({ ...item, status: 'pending' })));
    
    // Create concurrency limiter
    const limit = pLimit(CONCURRENCY_LIMIT);
    const totalItems = batchItems.length;
    let completedCount = 0;
    const results: any[] = [];
    
    // Batch state updates to avoid excessive re-renders
    const pendingUpdates: Map<string, Partial<BatchItem>> = new Map();
    let updateTimeout: NodeJS.Timeout | null = null;
    
    const flushUpdates = () => {
      if (pendingUpdates.size === 0) return;
      
      const updates = new Map(pendingUpdates);
      pendingUpdates.clear();
      
      setBatchItems(prev => prev.map(item => {
        const update = updates.get(item.id);
        return update ? { ...item, ...update } : item;
      }));
    };
    
    const scheduleUpdate = (itemId: string, update: Partial<BatchItem>) => {
      pendingUpdates.set(itemId, update);
      
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(flushUpdates, 100); // Batch updates every 100ms
    };
    
    // Process items with limited concurrency
    const processItem = async (item: BatchItem) => {
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      // Mark as processing
      scheduleUpdate(item.id, { status: 'processing' });
      
      try {
        const result = await extractItemMutation.mutateAsync({
          text: item.text,
          templateId: selectedTemplate,
          itemId: item.id
        });
        
        completedCount++;
        setProgress(Math.round((completedCount / totalItems) * 100));
        
        scheduleUpdate(item.id, {
          status: 'completed',
          result: result.extractedFields,
          confidence: result.confidence
        });
        
        results.push(result);
        return result;
      } catch (error) {
        completedCount++;
        setProgress(Math.round((completedCount / totalItems) * 100));
        
        scheduleUpdate(item.id, {
          status: 'failed',
          error: 'Extraction failed'
        });
        
        return null;
      }
    };
    
    try {
      // Process all items with concurrency limit
      await Promise.all(
        batchItems.map(item => limit(() => processItem(item)))
      );
      
      // Flush any remaining updates
      flushUpdates();
      
      if (onComplete) {
        onComplete(results.filter(Boolean));
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };
  
  // Stop processing
  const stopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
  };

  // Reset batch
  const resetBatch = () => {
    setBatchItems([]);
    setProgress(0);
    setIsProcessing(false);
  };

  // Export results
  const exportResults = () => {
    const results = batchItems
      .filter(item => item.status === 'completed')
      .map(item => ({
        input: item.text,
        extracted: item.result,
        confidence: item.confidence
      }));
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status counts
  const getStatusCounts = () => {
    const counts = {
      total: batchItems.length,
      completed: 0,
      failed: 0,
      pending: 0
    };
    
    batchItems.forEach(item => {
      if (item.status === 'completed') counts.completed++;
      else if (item.status === 'failed') counts.failed++;
      else if (item.status === 'pending') counts.pending++;
    });
    
    return counts;
  };

  const counts = getStatusCounts();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Configuration</CardTitle>
          <CardDescription>
            Select a template and add texts for batch processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Extraction Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              disabled={isProcessing}
            >
              <SelectTrigger data-testid="select-template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Input Method */}
          <div className="space-y-2">
            <Label>Input Method</Label>
            <div className="flex gap-2">
              <Button
                variant={inputMethod === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMethod('text')}
                disabled={isProcessing}
                data-testid="button-text-input"
              >
                <FileText className="w-4 h-4 mr-1" />
                Text Input
              </Button>
              <Button
                variant={inputMethod === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMethod('file')}
                disabled={isProcessing}
                data-testid="button-file-input"
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload File
              </Button>
            </div>
          </div>
          
          {/* Input Area */}
          {inputMethod === 'text' ? (
            <div className="space-y-2">
              <Label>Paste Multiple Texts (separated by {delimiter})</Label>
              <Textarea
                placeholder={`Enter first text here...\n${delimiter}\nEnter second text here...\n${delimiter}\nEnter third text here...`}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={8}
                disabled={isProcessing}
                data-testid="textarea-batch-input"
              />
              <div className="flex gap-2 items-center">
                <Label>Delimiter:</Label>
                <Input
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-24"
                  disabled={isProcessing}
                />
              </div>
              <Button
                onClick={parseTextInput}
                disabled={!textInput.trim() || isProcessing}
                size="sm"
                data-testid="button-parse-text"
              >
                Parse Texts
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Upload Text File</Label>
              <Input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
                data-testid="input-file-upload"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Items */}
      {batchItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Batch Queue</CardTitle>
                <CardDescription>
                  {counts.total} items • {counts.completed} completed • {counts.failed} failed
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isProcessing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={startProcessing}
                      disabled={!selectedTemplate}
                      data-testid="button-start-processing"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Process
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetBatch}
                      data-testid="button-reset"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={stopProcessing}
                    data-testid="button-stop"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
                {counts.completed > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportResults}
                    data-testid="button-export"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isProcessing && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {batchItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 border rounded-lg",
                      item.status === 'completed' && "border-green-500 bg-green-50 dark:bg-green-900/10",
                      item.status === 'failed' && "border-red-500 bg-red-50 dark:bg-red-900/10"
                    )}
                    data-testid={`batch-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.status === 'pending' && <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                          {item.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                          {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                          
                          <span className="text-sm font-medium">
                            {item.text.substring(0, 50)}...
                          </span>
                        </div>
                        
                        {item.confidence && (
                          <Badge variant="secondary" className="text-xs">
                            {(item.confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        )}
                        
                        {item.error && (
                          <Alert className="mt-2">
                            <AlertDescription className="text-xs">
                              {item.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}