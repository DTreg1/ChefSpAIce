import { useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { QuickActions } from '@/components/QuickActions';

export default function ChatPage() {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const chatInputRef = { current: null };

  const handleQuickAction = (prompt: string) => {
    // This will be passed to ChatInterface through props
    setInput(prompt);
  };

  const handleConversationSelect = (conversationId: string | undefined) => {
    setCurrentConversationId(conversationId);
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Sidebar with conversation history */}
      <div className="w-80 flex-shrink-0">
        <ConversationSidebar 
          currentConversationId={currentConversationId}
          onSelectConversation={handleConversationSelect}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Quick Actions - show only when no conversation is selected */}
        {!currentConversationId && (
          <QuickActions onActionClick={handleQuickAction} />
        )}

        {/* Chat Interface */}
        <div className="flex-1">
          <ChatInterface 
            conversationId={currentConversationId}
            onNewConversation={handleConversationSelect}
          />
        </div>
      </div>
    </div>
  );
}