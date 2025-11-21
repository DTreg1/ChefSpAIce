/**
 * Moderation System Test Page
 * 
 * This page allows testing the content moderation system with various types of content.
 * It demonstrates real-time toxicity detection and content filtering capabilities.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

// Test content samples
const TEST_SAMPLES = [
  {
    label: 'Safe Content',
    content: 'This is a delicious chocolate cake recipe. Mix flour, sugar, cocoa powder, eggs, and milk. Bake at 350°F for 30 minutes.',
    type: 'safe'
  },
  {
    label: 'Mildly Inappropriate',
    content: 'This recipe is stupid simple. Even an idiot could make it.',
    type: 'mild'
  },
  {
    label: 'Offensive Language',
    content: 'You\'re a complete moron if you can\'t follow this basic recipe.',
    type: 'offensive'
  },
  {
    label: 'Threatening Content',
    content: 'I\'ll come to your house and force you to eat this if you don\'t like it.',
    type: 'threat'
  },
  {
    label: 'Spam Content',
    content: 'BUY NOW!!! BEST DEALS!!! CLICK HERE!!! LIMITED TIME OFFER!!! 50% OFF!!!',
    type: 'spam'
  }
];

export default function ModerationTest() {
  const [content, setContent] = useState('');
  const [result, setResult] = useState<any>(null);

  // Mutation for checking content
  const checkContentMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('POST', '/api/moderate/check', {
        content: text,
        contentType: 'recipe'  // Using 'recipe' as a valid content type for testing
      });
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: any) => {
      setResult({
        error: true,
        message: error.message || 'Failed to check content'
      });
    }
  });

  const handleCheck = () => {
    if (content.trim()) {
      checkContentMutation.mutate(content);
    }
  };

  const loadSample = (sample: typeof TEST_SAMPLES[0]) => {
    setContent(sample.content);
    setResult(null);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'blocked': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'flagged': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Content Moderation Test</h1>
        
        {/* Test Samples */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Test Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TEST_SAMPLES.map((sample) => (
                <Button
                  key={sample.label}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample(sample)}
                  data-testid={`button-sample-${sample.type}`}
                >
                  {sample.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter content to test moderation..."
              className="min-h-[150px] mb-4"
              data-testid="textarea-content"
            />
            <Button
              onClick={handleCheck}
              disabled={!content.trim() || checkContentMutation.isPending}
              data-testid="button-check"
            >
              {checkContentMutation.isPending ? 'Checking...' : 'Check Content'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getActionIcon(result.action)}
                Moderation Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Action and Status */}
                  <div className="mb-4 flex items-center gap-4">
                    <Badge variant={result.allowed ? 'default' : 'destructive'}>
                      {result.allowed ? 'Allowed' : result.blocked ? 'Blocked' : 'Flagged'}
                    </Badge>
                    {result.severity && (
                      <Badge variant={getSeverityColor(result.severity)}>
                        Severity: {result.severity}
                      </Badge>
                    )}
                    {result.confidence !== undefined && (
                      <Badge variant="outline">
                        Confidence: {(result.confidence * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>

                  {/* Message */}
                  {result.message && (
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                  )}

                  {/* Categories */}
                  {result.categories && result.categories.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Detected Categories:</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.categories.map((category: string) => (
                          <Badge key={category} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toxicity Scores */}
                  {result.toxicityScores && Object.keys(result.toxicityScores).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Toxicity Scores:</h3>
                      <div className="space-y-2">
                        {Object.entries(result.toxicityScores).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-secondary rounded-full h-2">
                                <div
                                  className="bg-primary rounded-full h-2 transition-all"
                                  style={{ width: `${Math.min(value * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-mono">
                                {(value * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Suggestions:</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {result.suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}