/**
 * Streaming Chat Hook
 * 
 * React hook for handling streaming chat responses with SSE
 * and comprehensive error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { useStreamedContent } from './use-streamed-content';
import { useAIErrorHandler, parseAPIError, type AIErrorInfo } from './use-ai-error-handler';

export interface StreamingChatOptions {
  endpoint?: string;
  includeInventory?: boolean;
  onMessageComplete?: (message: string) => void;
  onError?: (error: AIErrorInfo) => void;
}

export interface StreamingChatState {
  isStreaming: boolean;
  streamedContent: string;
  error: AIErrorInfo | null;
  isRetrying: boolean;
  canRetry: boolean;
}

/**
 * Hook for streaming chat with error handling
 */
export function useStreamingChat(options: StreamingChatOptions = {}) {
  const {
    endpoint = '/api/v1/chat/stream',
    includeInventory = false,
    onMessageComplete,
    onError
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastMessageRef = useRef<string>('');

  // Use streamed content hook for batched updates
  const {
    displayContent,
    appendChunk,
    reset: resetContent,
    complete: completeContent,
    getFullContent
  } = useStreamedContent({
    batchInterval: 50,
    onComplete: onMessageComplete
  });

  // Use error handler hook
  const {
    error,
    isRetrying,
    canRetry,
    handleError,
    clearError,
    retry: retryHandler
  } = useAIErrorHandler({
    onRetry: () => sendMessage(lastMessageRef.current),
    maxRetries: 3,
    showToast: true
  });

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(async (message: string) => {
    // Store message for retry
    lastMessageRef.current = message;
    
    // Reset state
    clearError();
    resetContent();
    setIsStreaming(true);

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Send initial request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          includeInventory,
          streamingEnabled: true
        }),
      });

      if (!response.ok) {
        const error = await parseAPIError(response);
        handleError(error);
        if (onError) onError(error);
        setIsStreaming(false);
        return;
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        // Fallback to non-streaming response
        const data = await response.json();
        if (data.message) {
          appendChunk(data.message);
          completeContent();
        }
        setIsStreaming(false);
        return;
      }

      // Set up EventSource for SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Process SSE stream
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const event = line.slice(6).trim();
            continue; // Process event type
          }
          
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle different event types
              if (parsed.error) {
                // Error event
                const errorInfo: AIErrorInfo = {
                  message: parsed.message || 'Stream error',
                  code: parsed.code || 'STREAM_ERROR',
                  retryable: parsed.retryable ?? false,
                  retryAfter: parsed.retryAfter
                };
                handleError(errorInfo);
                if (onError) onError(errorInfo);
                setIsStreaming(false);
                return;
              } else if (parsed.timestamp) {
                // Meta events (connected, done)
                if (parsed.messageLength !== undefined) {
                  // Stream complete
                  completeContent();
                  setIsStreaming(false);
                }
              } else if (typeof parsed === 'string') {
                // Message chunk
                appendChunk(parsed);
              }
            } catch (e) {
              // If not JSON, treat as text chunk
              if (data) {
                appendChunk(data);
              }
            }
          }
        }
      }

      // Complete the stream
      completeContent();
      setIsStreaming(false);
      
    } catch (err: Error | unknown) {
      // Handle network or other errors
      const errorInfo: AIErrorInfo = {
        message: err instanceof Error ? err.message : 'Failed to connect to chat service',
        code: 'NETWORK_ERROR',
        retryable: true,
        retryAfter: undefined
      };
      
      handleError(errorInfo);
      if (onError) onError(errorInfo);
      setIsStreaming(false);
    }
  }, [
    endpoint,
    includeInventory,
    clearError,
    resetContent,
    appendChunk,
    completeContent,
    handleError,
    onError,
    onMessageComplete
  ]);

  /**
   * Stop streaming
   */
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    completeContent();
  }, [completeContent]);

  /**
   * Retry last message
   */
  const retry = useCallback(() => {
    if (lastMessageRef.current) {
      retryHandler();
    }
  }, [retryHandler]);

  return {
    sendMessage,
    stopStreaming,
    retry,
    isStreaming,
    streamedContent: displayContent,
    error,
    isRetrying,
    canRetry,
    clearError
  };
}

/**
 * Queue messages when offline
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useState(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued messages
      processQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const addToQueue = useCallback((message: string) => {
    setQueue(prev => [...prev, message]);
  }, []);

  const processQueue = useCallback(async () => {
    // Process queued messages when back online
    // This would integrate with your message sending logic
    const messages = [...queue];
    setQueue([]);
    
    // Send each queued message
    for (const message of messages) {
      // Send message logic here
      // console.log('Sending queued message:', message);
    }
  }, [queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    isOnline,
    addToQueue,
    clearQueue,
    queueLength: queue.length
  };
}