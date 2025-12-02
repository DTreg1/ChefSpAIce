import { useEffect, useRef, useState, useCallback } from "react";

interface UseStreamedContentOptions {
  batchInterval?: number; // Milliseconds between updates
  onComplete?: (content: string) => void;
}

/**
 * Hook to handle streamed content with batched updates to reduce re-renders
 * @param options Configuration options for batching
 * @returns [displayContent, appendChunk, reset] - displayContent for UI, appendChunk to add data, reset to clear
 */
export function useStreamedContent(options: UseStreamedContentOptions = {}) {
  const { batchInterval = 100, onComplete } = options;

  // The content displayed in the UI
  const [displayContent, setDisplayContent] = useState("");

  // Buffer for accumulating chunks between batch updates
  const bufferRef = useRef<string>("");

  // Full accumulated content
  const fullContentRef = useRef<string>("");

  // Timer for batched updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flag to track if we're actively streaming
  const isStreamingRef = useRef(false);

  // Function to flush the buffer to display
  const flushBuffer = useCallback(() => {
    if (bufferRef.current) {
      setDisplayContent((prev) => {
        const updated = prev + bufferRef.current;
        bufferRef.current = "";
        return updated;
      });
    }
  }, []);

  // Append a chunk of content
  const appendChunk = useCallback(
    (chunk: string) => {
      // Add to both buffer and full content
      bufferRef.current += chunk;
      fullContentRef.current += chunk;
      isStreamingRef.current = true;

      // Clear existing timer if any
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }

      // Schedule a batch update
      updateTimerRef.current = setTimeout(() => {
        flushBuffer();
        updateTimerRef.current = null;
      }, batchInterval);
    },
    [batchInterval, flushBuffer],
  );

  // Complete streaming and flush any remaining buffer
  const complete = useCallback(() => {
    // Clear any pending timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Flush any remaining buffer immediately
    flushBuffer();

    // Mark streaming as complete
    isStreamingRef.current = false;

    // Call completion callback if provided
    if (onComplete) {
      onComplete(fullContentRef.current);
    }
  }, [flushBuffer, onComplete]);

  // Reset the streamed content
  const reset = useCallback(() => {
    // Clear any pending timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Reset all state
    setDisplayContent("");
    bufferRef.current = "";
    fullContentRef.current = "";
    isStreamingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Get the full content without waiting for batch
  const getFullContent = useCallback(() => {
    return fullContentRef.current;
  }, []);

  return {
    displayContent,
    appendChunk,
    complete,
    reset,
    getFullContent,
    isStreaming: isStreamingRef.current,
  };
}
