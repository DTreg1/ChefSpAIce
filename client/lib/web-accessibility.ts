import { Platform } from "react-native";

export function webAccessibilityProps(onPress?: () => void) {
  if (Platform.OS !== "web") {
    return {};
  }

  return {
    tabIndex: 0 as 0,
    "data-focusable": true,
    onKeyPress: onPress
      ? (e: { nativeEvent?: { key?: string }; key?: string; preventDefault?: () => void }) => {
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

export function injectSkipToMainLink() {
  if (typeof document === "undefined") return;
  if (document.querySelector(".skip-to-main")) return;

  const link = document.createElement("a");
  link.className = "skip-to-main";
  link.href = "#main-content";
  link.textContent = "Skip to main content";
  document.body.insertBefore(link, document.body.firstChild);
}

export function injectWebFocusCSS() {
  if (Platform.OS !== "web" || focusCSSInjected || typeof document === "undefined") return;
  focusCSSInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .skip-to-main {
      position: fixed;
      top: 0;
      left: 16px;
      z-index: 99999;
      padding: 12px 24px;
      background-color: #1a3a1a;
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 600;
      border-radius: 0 0 8px 8px;
      text-decoration: none;
      transform: translateY(-100%);
      transition: transform 0.2s ease;
    }
    .skip-to-main:focus {
      transform: translateY(0);
      outline: 2px solid #2b7cb3;
      outline-offset: 2px;
    }
    [data-focusable]:focus-visible {
      outline: 2px solid #2b7cb3 !important;
      outline-offset: 2px !important;
    }
    @media (prefers-color-scheme: dark) {
      [data-focusable]:focus-visible {
        outline-color: #58b4f0 !important;
      }
      .skip-to-main:focus {
        outline-color: #58b4f0;
      }
    }
    [data-theme="dark"] [data-focusable]:focus-visible {
      outline-color: #58b4f0 !important;
    }
    [data-theme="dark"] .skip-to-main:focus {
      outline-color: #58b4f0;
    }
    [data-focusable]:focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);

  injectSkipToMainLink();
}
