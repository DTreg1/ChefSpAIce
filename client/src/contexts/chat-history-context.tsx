import { createContext, useContext, useState, type ReactNode } from "react";

interface ChatHistoryContextType {
  isVisible: boolean;
  toggle: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);

  const toggle = () => setIsVisible((prev) => !prev);

  return (
    <ChatHistoryContext.Provider value={{ isVisible, toggle }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistoryVisibility() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error("useChatHistoryVisibility must be used within a ChatHistoryProvider");
  }
  return context;
}
