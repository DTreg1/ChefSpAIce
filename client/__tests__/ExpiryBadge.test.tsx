/// <reference types="jest" />

import React from "react";

jest.unmock("react-native");

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
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
  };
});

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return {
    Feather: ({ name, ...props }: Record<string, unknown>) => (
      <Text testID="feather-icon" accessibilityLabel={name as string}>
        {name as string}
      </Text>
    ),
  };
});

jest.mock("@/components/ThemedText", () => {
  const { Text } = require("react-native");
  return {
    ThemedText: ({ children, style, ...rest }: Record<string, unknown>) => (
      <Text style={style as object} {...rest}>
        {children as React.ReactNode}
      </Text>
    ),
  };
});

jest.mock("@/constants/theme", () => ({
  Spacing: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
  BorderRadius: { sm: 8, md: 12, lg: 16, full: 9999 },
}));

import { render } from "@testing-library/react-native";
import { ExpiryBadge } from "@/components/inventory/ExpiryBadge";

function getBadgeContainer(result: ReturnType<typeof render>) {
  const json = result.toJSON() as any;
  return json;
}

function flattenStyle(style: any): Record<string, any> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean));
  }
  return style || {};
}

describe("ExpiryBadge", () => {
  describe("expired items (days < 0)", () => {
    it('displays "Expired" text for expired items', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={-3} />);
      expect(getByText("Expired")).toBeTruthy();
    });

    it("sets correct accessibility label for items expired multiple days ago", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={-5} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expired 5 days ago");
    });

    it("sets correct accessibility label for item expired 1 day ago", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={-1} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expired 1 day ago");
    });

    it("uses urgent (red) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={-2} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#ef4444");
    });

    it("shows alert-circle icon for expired items", () => {
      const { getByTestId } = render(<ExpiryBadge daysUntilExpiry={-1} />);
      const icon = getByTestId("feather-icon");
      expect(icon.props.accessibilityLabel).toBe("alert-circle");
    });
  });

  describe("expires today (days === 0)", () => {
    it('displays "Today!" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={0} />);
      expect(getByText("Today!")).toBeTruthy();
    });

    it("sets correct accessibility label", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={0} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expires today");
    });

    it("uses urgent (red) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={0} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#ef4444");
    });
  });

  describe("expires tomorrow (days === 1)", () => {
    it('displays "Tomorrow" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={1} />);
      expect(getByText("Tomorrow")).toBeTruthy();
    });

    it("sets correct accessibility label", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={1} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expires tomorrow");
    });

    it("uses urgent (red) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={1} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#ef4444");
    });
  });

  describe("expiring soon (2-3 days)", () => {
    it('displays "2 days" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={2} />);
      expect(getByText("2 days")).toBeTruthy();
    });

    it('displays "3 days" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={3} />);
      expect(getByText("3 days")).toBeTruthy();
    });

    it("uses warning (orange) background color for 2-3 days", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={2} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#f97316");
    });

    it("shows clock icon for 2-3 days range", () => {
      const { getByTestId } = render(<ExpiryBadge daysUntilExpiry={3} />);
      const icon = getByTestId("feather-icon");
      expect(icon.props.accessibilityLabel).toBe("clock");
    });

    it("sets correct accessibility label for 2 days", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={2} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expires in 2 days");
    });
  });

  describe("caution range (4-5 days)", () => {
    it("uses caution (yellow) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={4} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#eab308");
    });

    it("does not show icon for 4+ days", () => {
      const { queryByTestId } = render(<ExpiryBadge daysUntilExpiry={4} />);
      expect(queryByTestId("feather-icon")).toBeNull();
    });

    it('displays "5 days" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={5} />);
      expect(getByText("5 days")).toBeTruthy();
    });
  });

  describe("soon range (6-7 days)", () => {
    it("uses soon (light yellow) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={7} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#fef3c7");
    });

    it('displays "7 days" text', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={7} />);
      expect(getByText("7 days")).toBeTruthy();
    });
  });

  describe("fresh items (days > 7)", () => {
    it("uses neutral (gray) background color", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={14} />);
      const container = getBadgeContainer(result);
      const style = flattenStyle(container.props.style);
      expect(style.backgroundColor).toBe("#9ca3af");
    });

    it('displays "14 days" text for fresh items', () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={14} />);
      expect(getByText("14 days")).toBeTruthy();
    });

    it("does not show icon for fresh items", () => {
      const { queryByTestId } = render(<ExpiryBadge daysUntilExpiry={14} />);
      expect(queryByTestId("feather-icon")).toBeNull();
    });

    it("sets correct accessibility label", () => {
      const result = render(<ExpiryBadge daysUntilExpiry={30} />);
      const container = getBadgeContainer(result);
      expect(container.props.accessibilityLabel).toBe("Expires in 30 days");
    });
  });

  describe("size variants", () => {
    it("renders with small size without crashing", () => {
      const { getByText } = render(
        <ExpiryBadge daysUntilExpiry={5} size="small" />,
      );
      expect(getByText("5 days")).toBeTruthy();
    });

    it("renders with medium size (default) without crashing", () => {
      const { getByText } = render(<ExpiryBadge daysUntilExpiry={5} />);
      expect(getByText("5 days")).toBeTruthy();
    });

    it("renders with large size without crashing", () => {
      const { getByText } = render(
        <ExpiryBadge daysUntilExpiry={5} size="large" />,
      );
      expect(getByText("5 days")).toBeTruthy();
    });
  });
});
