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

jest.mock("react-native-reanimated", () => {
  const { View, Pressable: _Pressable } = require("react-native");
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: React.ComponentType) => Component,
      View: View,
      call: () => {},
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (v: number) => v,
    withTiming: (v: number) => v,
    withRepeat: (v: number) => v,
    withSequence: (v: number) => v,
    cancelAnimation: () => {},
    createAnimatedComponent: (Component: React.ComponentType) => Component,
    FadeIn: { delay: () => ({}) },
    FadeOut: {},
    Layout: { springify: () => ({}) },
  };
});

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return {
    BlurView: ({ children, style, ...props }: Record<string, unknown>) => (
      <View style={style as object} {...props}>
        {children as React.ReactNode}
      </View>
    ),
  };
});

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Feather: (props: Record<string, unknown>) => <View testID="mock-icon" />,
  };
});

jest.mock("@/components/ThemedText", () => {
  const { Text } = require("react-native");
  return {
    ThemedText: ({ children, ...rest }: Record<string, unknown>) => (
      <Text {...rest}>{children as React.ReactNode}</Text>
    ),
  };
});

jest.mock("@/constants/theme", () => ({
  Spacing: { sm: 4, md: 8, lg: 12, xl: 16, buttonHeight: 48 },
  AppColors: { primary: "#4CAF50", secondary: "#2196F3" },
  GlassEffect: {
    borderWidth: 1,
    borderRadius: { sm: 8, md: 12, lg: 16 },
  },
  BorderRadius: { sm: 8, md: 12, lg: 16, full: 9999 },
}));

import { render, fireEvent } from "@testing-library/react-native";
import { GlassButton } from "@/components/GlassButton";

describe("GlassButton", () => {
  it("renders the button label text", () => {
    const { getByText } = render(
      <GlassButton onPress={() => {}}>Save Recipe</GlassButton>,
    );
    expect(getByText("Save Recipe")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <GlassButton onPress={mockPress}>Click Me</GlassButton>,
    );
    fireEvent.press(getByText("Click Me"));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <GlassButton onPress={mockPress} disabled>
        Disabled
      </GlassButton>,
    );
    fireEvent.press(getByText("Disabled"));
    expect(mockPress).not.toHaveBeenCalled();
  });

  it("sets accessibilityRole to button", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}}>Press</GlassButton>,
    );
    expect(getByRole("button")).toBeTruthy();
  });

  it("sets disabled accessibility state when disabled", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}} disabled>
        Disabled
      </GlassButton>,
    );
    const button = getByRole("button");
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it("sets disabled accessibility state when loading", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}} loading>
        Loading
      </GlassButton>,
    );
    const button = getByRole("button");
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it("uses custom accessibilityLabel when provided", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}} accessibilityLabel="Save your recipe now">
        Save
      </GlassButton>,
    );
    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Save your recipe now");
  });

  it("uses children text as accessibilityLabel by default", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}}>Save Recipe</GlassButton>,
    );
    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Save Recipe");
  });

  it("applies testID when provided", () => {
    const { getByTestId } = render(
      <GlassButton onPress={() => {}} testID="button-save">
        Save
      </GlassButton>,
    );
    expect(getByTestId("button-save")).toBeTruthy();
  });

  it("renders with different variants without crashing", () => {
    const variants = ["primary", "secondary", "outline", "ghost"] as const;
    variants.forEach((variant) => {
      const { getByText, unmount } = render(
        <GlassButton onPress={() => {}} variant={variant}>
          {variant}
        </GlassButton>,
      );
      expect(getByText(variant)).toBeTruthy();
      unmount();
    });
  });

  it("does not fire onPress when loading", () => {
    const mockPress = jest.fn();
    const { getByRole } = render(
      <GlassButton onPress={mockPress} loading>
        Loading
      </GlassButton>,
    );
    fireEvent.press(getByRole("button"));
    expect(mockPress).not.toHaveBeenCalled();
  });

  it("applies reduced opacity when disabled", () => {
    const { getByRole } = render(
      <GlassButton onPress={() => {}} disabled>
        Disabled
      </GlassButton>,
    );
    const button = getByRole("button");
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.opacity).toBe(0.5);
  });
});
