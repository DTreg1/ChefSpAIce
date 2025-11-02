import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Lightbulb, 
  Mail, 
  Clock, 
  Calendar,
  Send,
  RefreshCw,
  CheckCircle,
  Target,
  Sparkles,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserPrediction } from "@shared/schema";

interface InterventionSuggestionsProps {
  userId?: string;
  prediction?: UserPrediction;
  onInterventionSent?: (intervention: any) => void;
}

interface InterventionStrategy {
  action: string;
  emailSubject: string;
  keyMessage: string;
  timing: string;
}

interface InterventionResponse {
  intervention: {
    predictionId: string;
    userId: string;
    riskLevel: string;
    recommendedAction: string;
    strategies: {
      immediate: InterventionStrategy;
      shortTerm: InterventionStrategy;
      longTerm: InterventionStrategy;
    };
    confidence: number;
    generatedAt: string;
  };
}

export function InterventionSuggestions({ userId, prediction, onInterventionSent }: InterventionSuggestionsProps) {
  const { toast } = useToast();
  const [selectedStrategy, setSelectedStrategy] = useState<'immediate' | 'shortTerm' | 'longTerm'>('immediate');
  const [interventionData, setInterventionData] = useState<InterventionResponse | null>(null);

  const generateMutation = useMutation({
    mutationFn: async ({ userId, predictionId, regenerate }: any) => {
      const response = await apiRequest('/api/predict/intervention', {
        method: 'POST',
        body: JSON.stringify({ userId, predictionId, regenerate }),
      });
      return response.json();
    },
    onSuccess: (data: InterventionResponse) => {
      setInterventionData(data);
      toast({
        title: "Intervention Generated",
        description: "AI has created personalized retention strategies",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/predict/user', userId] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendInterventionMutation = useMutation({
    mutationFn: async (strategy: InterventionStrategy) => {
      // In a real app, this would trigger an email campaign
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1000);
      });
    },
    onSuccess: (_, strategy) => {
      toast({
        title: "Intervention Sent",
        description: `Email campaign "${strategy.emailSubject}" has been triggered`,
      });
      onInterventionSent?.(strategy);
    },
  });

  const handleGenerateIntervention = (regenerate = false) => {
    if (prediction && userId) {
      generateMutation.mutate({ 
        userId, 
        predictionId: prediction.id,
        regenerate 
      });
    }
  };

  if (!prediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Intervention Strategies
          </CardTitle>
          <CardDescription>
            Select a user with churn risk to generate intervention strategies
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const riskPercentage = Math.round((prediction.probability || 0) * 100);
  const intervention = interventionData?.intervention;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Intervention Strategies
          </span>
          <Badge variant={riskPercentage >= 80 ? "destructive" : "default"}>
            {riskPercentage}% Risk
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered retention strategies for user {userId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!intervention ? (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate personalized intervention strategies using AI
            </p>
            <Button 
              onClick={() => handleGenerateIntervention()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-intervention"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Strategies
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <Alert>
              <Target className="h-4 w-4" />
              <AlertTitle>Recommended Action</AlertTitle>
              <AlertDescription>
                {intervention.recommendedAction}
              </AlertDescription>
            </Alert>

            <Tabs value={selectedStrategy} onValueChange={(v) => setSelectedStrategy(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="immediate">
                  <Clock className="h-4 w-4 mr-2" />
                  Immediate
                </TabsTrigger>
                <TabsTrigger value="shortTerm">
                  <Zap className="h-4 w-4 mr-2" />
                  Short-term
                </TabsTrigger>
                <TabsTrigger value="longTerm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Long-term
                </TabsTrigger>
              </TabsList>

              <TabsContent value="immediate" className="space-y-3">
                <StrategyCard 
                  strategy={intervention.strategies.immediate}
                  onSend={() => sendInterventionMutation.mutate(intervention.strategies.immediate)}
                  isSending={sendInterventionMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="shortTerm" className="space-y-3">
                <StrategyCard 
                  strategy={intervention.strategies.shortTerm}
                  onSend={() => sendInterventionMutation.mutate(intervention.strategies.shortTerm)}
                  isSending={sendInterventionMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="longTerm" className="space-y-3">
                <StrategyCard 
                  strategy={intervention.strategies.longTerm}
                  onSend={() => sendInterventionMutation.mutate(intervention.strategies.longTerm)}
                  isSending={sendInterventionMutation.isPending}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                <span>Confidence: {Math.round(intervention.confidence * 100)}%</span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleGenerateIntervention(true)}
                disabled={generateMutation.isPending}
                data-testid="button-regenerate"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StrategyCard({ 
  strategy, 
  onSend, 
  isSending 
}: { 
  strategy: InterventionStrategy;
  onSend: () => void;
  isSending: boolean;
}) {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium">{strategy.action}</h4>
          <Badge variant="outline" className="text-xs">
            {strategy.timing}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Mail className="h-3 w-3" />
            <span className="font-medium">Subject:</span>
            <span className="text-muted-foreground">{strategy.emailSubject}</span>
          </div>
          
          <div className="text-xs text-muted-foreground pl-5">
            {strategy.keyMessage}
          </div>
        </div>
      </div>

      <Button 
        size="sm" 
        className="w-full"
        onClick={onSend}
        disabled={isSending}
        data-testid="button-send-campaign"
      >
        {isSending ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Campaign
          </>
        )}
      </Button>
    </div>
  );
}