import { useState, useEffect, useCallback } from 'react';

interface ProgressiveDisclosureState {
  [key: string]: boolean;
}

const STORAGE_KEY = 'chefspice-progressive-disclosure';

export function useProgressiveDisclosure(defaultExpanded: boolean = false) {
  const [expandedStates, setExpandedStates] = useState<ProgressiveDisclosureState>(() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever states change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedStates));
    } catch {
      // Fail silently if localStorage is not available
    }
  }, [expandedStates]);

  const isExpanded = useCallback((id: string): boolean => {
    return expandedStates[id] ?? defaultExpanded;
  }, [expandedStates, defaultExpanded]);

  const setExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedStates(prev => ({
      ...prev,
      [id]: expanded
    }));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [id]: !(prev[id] ?? defaultExpanded)
    }));
  }, [defaultExpanded]);

  const clearAll = useCallback(() => {
    setExpandedStates({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fail silently
    }
  }, []);

  return {
    isExpanded,
    setExpanded,
    toggleExpanded,
    clearAll,
    expandedStates
  };
}

// Hook for individual sections with automatic ID management
export function useProgressiveSection(sectionId: string, defaultExpanded: boolean = false) {
  const { isExpanded, setExpanded } = useProgressiveDisclosure(defaultExpanded);
  const expanded = isExpanded(sectionId);
  
  const toggle = useCallback(() => {
    setExpanded(sectionId, !expanded);
  }, [sectionId, expanded, setExpanded]);

  return {
    expanded,
    setExpanded: (value: boolean) => setExpanded(sectionId, value),
    toggle
  };
}