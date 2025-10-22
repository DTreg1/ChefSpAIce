import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface ProgressiveDisclosureContextType {
  expandedStates: Record<string, boolean>;
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, expanded: boolean) => void;
}

const ProgressiveDisclosureContext = createContext<ProgressiveDisclosureContextType | undefined>(undefined);

const STORAGE_KEY = 'progressiveDisclosure';

export function ProgressiveDisclosureProvider({ children }: { children: ReactNode }) {
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedStates));
    } catch (error) {
      console.error('Failed to save progressive disclosure state:', error);
    }
  }, [expandedStates]);

  const isExpanded = useCallback((id: string) => {
    return expandedStates[id] ?? false;
  }, [expandedStates]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const setExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedStates(prev => ({
      ...prev,
      [id]: expanded
    }));
  }, []);

  return (
    <ProgressiveDisclosureContext.Provider value={{
      expandedStates,
      isExpanded,
      toggleExpanded,
      setExpanded
    }}>
      {children}
    </ProgressiveDisclosureContext.Provider>
  );
}

export function useProgressiveDisclosure() {
  const context = useContext(ProgressiveDisclosureContext);
  if (!context) {
    throw new Error('useProgressiveDisclosure must be used within ProgressiveDisclosureProvider');
  }
  return context;
}

export function useProgressiveSection(id: string, defaultExpanded = false) {
  const { isExpanded, setExpanded } = useProgressiveDisclosure();
  
  // Initialize state on first render if not already set
  useEffect(() => {
    const currentState = isExpanded(id);
    if (currentState === undefined) {
      setExpanded(id, defaultExpanded);
    }
  }, [id, defaultExpanded, isExpanded, setExpanded]);
  
  return {
    expanded: isExpanded(id) ?? defaultExpanded,
    setExpanded: (expanded: boolean) => setExpanded(id, expanded)
  };
}