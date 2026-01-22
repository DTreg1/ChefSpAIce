import React, { createContext, useContext, useState, useCallback } from "react";

interface ScreenSearchState {
  query: string;
  isOpen: boolean;
}

interface SearchContextType {
  getSearchQuery: (screenKey: string) => string;
  setSearchQuery: (screenKey: string, query: string) => void;
  isSearchOpen: (screenKey: string) => boolean;
  openSearch: (screenKey: string) => void;
  closeSearch: (screenKey: string) => void;
  collapseSearch: (screenKey: string) => void;
  clearSearch: (screenKey: string) => void;
  clearAllSearches: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchStates, setSearchStates] = useState<
    Record<string, ScreenSearchState>
  >({});

  const getSearchQuery = useCallback(
    (screenKey: string) => {
      return searchStates[screenKey]?.query || "";
    },
    [searchStates],
  );

  const setSearchQuery = useCallback((screenKey: string, query: string) => {
    setSearchStates((prev) => ({
      ...prev,
      [screenKey]: {
        ...prev[screenKey],
        query,
        isOpen: prev[screenKey]?.isOpen ?? false,
      },
    }));
  }, []);

  const isSearchOpen = useCallback(
    (screenKey: string) => {
      return searchStates[screenKey]?.isOpen || false;
    },
    [searchStates],
  );

  const openSearch = useCallback((screenKey: string) => {
    setSearchStates((prev) => ({
      ...prev,
      [screenKey]: { query: prev[screenKey]?.query || "", isOpen: true },
    }));
  }, []);

  const closeSearch = useCallback((screenKey: string) => {
    setSearchStates((prev) => ({
      ...prev,
      [screenKey]: { query: "", isOpen: false },
    }));
  }, []);

  const collapseSearch = useCallback((screenKey: string) => {
    setSearchStates((prev) => {
      const current = prev[screenKey];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [screenKey]: { query: current.query, isOpen: false },
      };
    });
  }, []);

  const clearSearch = useCallback((screenKey: string) => {
    setSearchStates((prev) => ({
      ...prev,
      [screenKey]: {
        ...prev[screenKey],
        query: "",
        isOpen: prev[screenKey]?.isOpen ?? false,
      },
    }));
  }, []);

  const clearAllSearches = useCallback(() => {
    setSearchStates({});
  }, []);

  return (
    <SearchContext.Provider
      value={{
        getSearchQuery,
        setSearchQuery,
        isSearchOpen,
        openSearch,
        closeSearch,
        collapseSearch,
        clearSearch,
        clearAllSearches,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
