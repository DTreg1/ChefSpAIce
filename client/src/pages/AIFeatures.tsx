/**
 * AI Features Page
 * 
 * Main page for accessing all ML-powered features
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Mic,
  Mail,
  Edit3,
  Sparkles,
  Info
} from "lucide-react";

// Import all ML feature components
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { VoiceCommands } from "@/components/VoiceCommands";
import { EmailDrafting } from "@/components/EmailDrafting";
import { WritingAssistant } from "@/components/WritingAssistant";

export default function AIFeatures() {
  const [activeTab, setActiveTab] = useState("chat");

  const features = [
    {
      id: "chat",
      title: "AI Chat Assistant",
      description: "Have intelligent conversations with memory",
      icon: MessageCircle,
      component: AIChatAssistant,
      badge: "GPT-5"
    },
    {
      id: "voice",
      title: "Voice Commands",
      description: "Control the app with voice commands",
      icon: Mic,
      component: VoiceCommands,
      badge: "Web Speech API"
    },
    {
      id: "drafts",
      title: "Email Drafting",
      description: "Generate contextual message drafts",
      icon: Mail,
      component: EmailDrafting,
      badge: "GPT-3.5"
    },
    {
      id: "writing",
      title: "Writing Assistant",
      description: "Improve your writing with AI suggestions",
      icon: Edit3,
      component: WritingAssistant,
      badge: "Advanced"
    }
  ];

  const ActiveComponent = features.find(f => f.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                AI-Powered Features
              </h1>
              <p className="text-muted-foreground mt-2">
                Enhance your experience with intelligent ML features
              </p>
            </div>
            <Alert className="max-w-md">
              <Info className="h-4 w-4" />
              <AlertDescription>
                All AI features use Replit AI Integrations. Usage is billed to your credits.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Feature Selection */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  activeTab === feature.id ? "border-primary shadow-lg" : ""
                }`}
                onClick={() => setActiveTab(feature.id)}
                data-testid={`card-feature-${feature.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Feature Content */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="hidden">
              {features.map((feature) => (
                <TabsTrigger key={feature.id} value={feature.id}>
                  {feature.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {features.map((feature) => {
              const Component = feature.component;
              return (
                <TabsContent key={feature.id} value={feature.id} className="mt-0">
                  <Component />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </div>
  );
}