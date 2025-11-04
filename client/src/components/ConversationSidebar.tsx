import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Conversation } from '@shared/schema';

// Extended conversation type with optional display fields
type ConversationWithMeta = Conversation & {
  lastMessage?: string;
  messageCount?: number;
};

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string | undefined) => void;
}

export function ConversationSidebar({ 
  currentConversationId, 
  onSelectConversation 
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery<ConversationWithMeta[]>({
    queryKey: ['/api/chat/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest('DELETE', `/api/chat/conversation/${conversationId}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      
      // If we deleted the current conversation, select a new one
      if (deletedId === currentConversationId) {
        onSelectConversation(undefined);
      }
    },
  });

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv: ConversationWithMeta) => {
    if (!searchQuery) return true;
    return conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleNewConversation = () => {
    onSelectConversation(undefined);
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewConversation}
          className="w-full mb-3"
          data-testid="button-new-conversation"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              Loading conversations...
            </div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          )}

          {filteredConversations.map((conversation: Conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "group relative p-3 rounded-lg cursor-pointer transition-colors hover-elevate mb-2",
                currentConversationId === conversation.id && "bg-accent"
              )}
              data-testid={`conversation-item-${conversation.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {conversation.title || 'New Conversation'}
                  </h3>
                  {conversation.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversation.updatedAt && format(new Date(conversation.updatedAt), 'MMM d, HH:mm')}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteConversation(e, conversation.id)}
                  data-testid={`button-delete-conversation-${conversation.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              {conversation.messageCount && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3" />
                  <span>{conversation.messageCount} messages</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}