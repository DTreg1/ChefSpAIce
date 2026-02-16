/// <reference types="jest" />

import React from "react";

jest.unmock("react-native");

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      text: "#000000",
      textSecondary: "#666666",
      glass: {
        background: "rgba(255,255,255,0.1)",
        border: "rgba(255,255,255,0.2)",
      },
    },
    isDark: false,
  }),
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Feather: (props: Record<string, unknown>) => (
      <View testID={props.testID as string} accessibilityLabel={props.name as string} />
    ),
  };
});

jest.mock("@/components/ThemedText", () => {
  const { Text } = require("react-native");
  return {
    ThemedText: ({ children, testID, ...rest }: Record<string, unknown>) => (
      <Text testID={testID as string} {...rest}>
        {children as React.ReactNode}
      </Text>
    ),
  };
});

import { render, fireEvent } from "@testing-library/react-native";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders the title text", () => {
    const { getByTestId } = render(
      <EmptyState icon="inbox" title="No Items" description="Your inventory is empty" />,
    );
    const title = getByTestId("text-empty-state-title");
    expect(title.props.children).toBe("No Items");
  });

  it("renders the description text", () => {
    const { getByTestId } = render(
      <EmptyState icon="inbox" title="No Items" description="Your inventory is empty" />,
    );
    const description = getByTestId("text-empty-state-description");
    expect(description.props.children).toBe("Your inventory is empty");
  });

  it("renders the icon", () => {
    const { getByTestId } = render(
      <EmptyState icon="inbox" title="No Items" description="Your inventory is empty" />,
    );
    const icon = getByTestId("icon-empty-state");
    expect(icon).toBeTruthy();
    expect(icon.props.accessibilityLabel).toBe("inbox");
  });

  it("sets accessibility label combining title and description", () => {
    const { getByTestId } = render(
      <EmptyState icon="inbox" title="No Items" description="Your inventory is empty" />,
    );
    const container = getByTestId("container-empty-state");
    expect(container.props.accessibilityLabel).toBe("No Items. Your inventory is empty");
  });

  it("does not render action button when actionLabel is not provided", () => {
    const { queryByTestId } = render(
      <EmptyState icon="inbox" title="No Items" description="Your inventory is empty" />,
    );
    expect(queryByTestId("button-empty-state-action")).toBeNull();
  });

  it("renders action button when actionLabel and onAction are provided", () => {
    const mockAction = jest.fn();
    const { getByTestId } = render(
      <EmptyState
        icon="plus"
        title="No Items"
        description="Add your first item"
        actionLabel="Add Item"
        onAction={mockAction}
      />,
    );
    const button = getByTestId("button-empty-state-action");
    expect(button).toBeTruthy();
  });

  it("calls onAction when the action button is pressed", () => {
    const mockAction = jest.fn();
    const { getByTestId } = render(
      <EmptyState
        icon="plus"
        title="No Items"
        description="Add your first item"
        actionLabel="Add Item"
        onAction={mockAction}
      />,
    );
    fireEvent.press(getByTestId("button-empty-state-action"));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("disables the action button when actionDisabled is true", () => {
    const mockAction = jest.fn();
    const { getByTestId } = render(
      <EmptyState
        icon="plus"
        title="No Items"
        description="Add your first item"
        actionLabel="Add Item"
        onAction={mockAction}
        actionDisabled={true}
      />,
    );
    const button = getByTestId("button-empty-state-action");
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it("does not render action button when only actionLabel is provided without onAction", () => {
    const { queryByTestId } = render(
      <EmptyState
        icon="inbox"
        title="No Items"
        description="Your inventory is empty"
        actionLabel="Add Item"
      />,
    );
    expect(queryByTestId("button-empty-state-action")).toBeNull();
  });

  it("renders different icon names correctly", () => {
    const { getByTestId } = render(
      <EmptyState icon="shopping-cart" title="Empty Cart" description="No items in cart" />,
    );
    const icon = getByTestId("icon-empty-state");
    expect(icon.props.accessibilityLabel).toBe("shopping-cart");
  });
});
