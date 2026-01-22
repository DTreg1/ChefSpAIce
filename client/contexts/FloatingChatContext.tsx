import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface FloatingChatContextType {
  isVisible: boolean;
  isChatOpen: boolean;
  showFloatingChat: () => void;
  hideFloatingChat: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(
  undefined,
);

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const showFloatingChat = useCallback(() => setIsVisible(true), []);
  const hideFloatingChat = useCallback(() => setIsVisible(false), []);
  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  return (
    <FloatingChatContext.Provider
      value={{
        isVisible,
        isChatOpen,
        showFloatingChat,
        hideFloatingChat,
        openChat,
        closeChat,
      }}
    >
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const context = useContext(FloatingChatContext);
  if (!context) {
    throw new Error(
      "useFloatingChat must be used within a FloatingChatProvider",
    );
  }
  return context;
}
