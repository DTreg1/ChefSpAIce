import { useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { QuickActions } from '@/components/QuickActions';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function AIAssistant() {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [inputPrompt, setInputPrompt] = useState('');

  const handleQuickAction = (prompt: string) => {
    // Pass the prompt to ChatInterface
    setInputPrompt(prompt);
  };

  const handleConversationSelect = (conversationId: string | undefined) => {
    setCurrentConversationId(conversationId);
    // Clear the prompt when switching conversations
    setInputPrompt('');
  };

  const handleInitialMessageSent = () => {
    // Clear the prompt after it's been sent
    setInputPrompt('');
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar with conversation history */}
      <div className="w-80 flex-shrink-0">
        <ConversationSidebar 
          currentConversationId={currentConversationId}
          onSelectConversation={handleConversationSelect}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                  Ask me anything about the app, get help with features, or have a conversation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions - show only when no conversation is selected */}
        {!currentConversationId && (
          <QuickActions onActionClick={handleQuickAction} />
        )}

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface 
            conversationId={currentConversationId}
            onNewConversation={handleConversationSelect}
            initialMessage={inputPrompt}
            onInitialMessageSent={handleInitialMessageSent}
          />
        </div>
      </div>
    </div>
  );
}