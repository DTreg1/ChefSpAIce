import { Platform } from "react-native";

export function webAccessibilityProps(onPress?: () => void) {
  if (Platform.OS !== "web") {
    return {};
  }

  return {
    tabIndex: 0 as 0,
    "data-focusable": true,
    onKeyPress: onPress
      ? (e: any) => {
          const key = e.nativeEvent?.key ?? e.key;
          if (key === "Enter" || key === " ") {
            e.preventDefault?.();
            onPress();
          }
        }
      : undefined,
  };
}

let focusCSSInjected = false;

export function injectWebFocusCSS() {
  if (Platform.OS !== "web" || focusCSSInjected || typeof document === "undefined") return;
  focusCSSInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    [data-focusable]:focus-visible {
      outline: 2px solid #4A90D9 !important;
      outline-offset: 2px !important;
    }
    [data-focusable]:focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}
