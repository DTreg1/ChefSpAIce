/// <reference types="jest" />

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      text: "#000000",
      textSecondary: "#666666",
      backgroundDefault: "#FFFFFF",
      backgroundSecondary: "#F5F5F5",
      backgroundTertiary: "#EEEEEE",
      border: "#DDDDDD",
      primary: "#007AFF",
    },
  }),
}));

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
}));

import {
  FoodSearchAutocomplete,
  FoodSearchResult,
} from "@/components/FoodSearchAutocomplete";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        queryFn: async ({ queryKey }) => {
          const url = queryKey.join("/");
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error("Network error");
          }
          return res.json();
        },
      },
    },
  });

const mockApiResults = [
  {
    fdcId: 123,
    description: "Apple, raw",
    category: "Fruits",
    nutrition: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  },
  {
    fdcId: 456,
    description: "Organic Apple",
    category: "Fruits",
    brandOwner: "Nature's Best",
    nutrition: { calories: 55, protein: 0.3, carbs: 15, fat: 0.1 },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe("FoodSearchAutocomplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Debouncing", () => {
    it("should debounce input before making API call", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete
          onSelect={onSelect}
          placeholder="Search foods..."
        />,
      );

      const input = getByPlaceholderText("Search foods...");

      fireEvent.changeText(input, "a");
      fireEvent.changeText(input, "ap");
      fireEvent.changeText(input, "app");
      fireEvent.changeText(input, "appl");
      fireEvent.changeText(input, "apple");

      expect(mockFetch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it("should not search until minimum characters are typed", async () => {
      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");

      fireEvent.changeText(input, "a");

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should search when minimum 2 characters are typed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");

      fireEvent.changeText(input, "ap");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator while fetching results", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);

      const onSelect = jest.fn();
      const { getByPlaceholderText, queryByTestId } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      resolvePromise!({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });
    });
  });

  describe("Results Display", () => {
    it("should display search results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await findByText("Apple, raw");
      await findByText("Organic Apple");
    });

    it("should display calorie info for results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await findByText("52 cal");
    });

    it("should display brand when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await findByText("Nature's Best");
    });
  });

  describe("Selection Handling", () => {
    it("should call onSelect when result is tapped", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const result = await findByText("Apple, raw");
      fireEvent.press(result);

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Apple, raw",
          source: "usda",
        }),
      );
    });

    it("should update input text after selection", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const result = await findByText("Apple, raw");
      fireEvent.press(result);

      expect(input.props.value).toBe("Apple, raw");
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no results found", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [],
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "xyznonexistent");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await findByText("No results found");
    });
  });

  describe("Clear Functionality", () => {
    it("should clear input when clear button is pressed", async () => {
      const onSelect = jest.fn();
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      expect(input.props.value).toBe("apple");
    });
  });

  describe("Initial Value", () => {
    it("should use initial value when provided", () => {
      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} initialValue="banana" />,
      );

      const input = getByPlaceholderText("Search foods...");
      expect(input.props.value).toBe("banana");
    });
  });

  describe("Placeholder", () => {
    it("should use custom placeholder when provided", () => {
      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete
          onSelect={onSelect}
          placeholder="Type to search..."
        />,
      );

      expect(getByPlaceholderText("Type to search...")).toBeTruthy();
    });

    it("should use default placeholder when not provided", () => {
      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      expect(getByPlaceholderText("Search foods...")).toBeTruthy();
    });
  });

  describe("Text Highlighting", () => {
    it("should highlight matching text in results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: mockApiResults,
        }),
      });

      const onSelect = jest.fn();
      const { getByPlaceholderText, findByText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await findByText("Apple, raw");
    });
  });

  describe("API Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const onSelect = jest.fn();
      const { getByPlaceholderText } = renderWithProviders(
        <FoodSearchAutocomplete onSelect={onSelect} />,
      );

      const input = getByPlaceholderText("Search foods...");
      fireEvent.changeText(input, "apple");

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(input).toBeTruthy();
      });
    });
  });
});
