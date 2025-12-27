import React from "react";
import { Text } from "react-native";
import { create, act, ReactTestRenderer } from "react-test-renderer";

const mockTerms = [
  {
    id: 1,
    term: "sauté",
    definition: "To cook quickly in a small amount of fat",
    category: "technique",
    difficulty: "beginner",
  },
  {
    id: 2,
    term: "dice",
    definition: "To cut into small cubes",
    category: "cut",
    difficulty: "beginner",
  },
  {
    id: 3,
    term: "julienne",
    definition: "To cut into thin strips",
    category: "cut",
    difficulty: "intermediate",
  },
];

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({
    data: mockTerms,
    isLoading: false,
    error: null,
  })),
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      text: "#000000",
      primary: "#007AFF",
    },
  }),
}));

import { TermHighlighter } from "../components/TermHighlighter";

describe("TermHighlighter", () => {
  const mockOnTermPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders text content", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <TermHighlighter
          text="Just some plain text"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });

  it("renders without crashing with empty text", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<TermHighlighter text="" onTermPress={mockOnTermPress} />);
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });

  it("renders text with cooking terms", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <TermHighlighter
          text="First, dice the onions and sauté them"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });

  it("creates a tree structure for text with terms", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <TermHighlighter
          text="Dice the vegetables"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.root;
    const textComponents = instance.findAllByType(Text);
    expect(textComponents.length).toBeGreaterThan(0);
  });

  it("handles text with multiple term instances", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <TermHighlighter
          text="Dice the onions, then dice the peppers, and finally dice the garlic"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });

  it("preserves original text case in output", () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(
        <TermHighlighter
          text="SAUTÉ the vegetables"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();

    const json = JSON.stringify(instance);
    expect(json).toContain("SAUTÉ");
  });
});

describe("TermHighlighter with no terms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useQuery } = require("@tanstack/react-query");
    useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("renders plain text when no terms available", () => {
    const mockOnTermPress = jest.fn();
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <TermHighlighter
          text="Just some plain text"
          onTermPress={mockOnTermPress}
        />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });
});

describe("TermHighlighter loading state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useQuery } = require("@tanstack/react-query");
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
  });

  it("renders text while loading", () => {
    const mockOnTermPress = jest.fn();
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <TermHighlighter text="Loading text" onTermPress={mockOnTermPress} />,
      );
    });

    const instance = tree!.toJSON();
    expect(instance).toBeTruthy();
  });
});
