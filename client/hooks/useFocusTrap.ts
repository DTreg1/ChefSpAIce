import { useRef, useEffect, useCallback } from "react";
import { AccessibilityInfo, Platform, findNodeHandle } from "react-native";

interface UseFocusTrapOptions {
  visible: boolean;
  onDismiss?: () => void;
}

function setNativeFocus(ref: React.RefObject<any>) {
  if (!ref.current) return;
  const handle = findNodeHandle(ref.current);
  if (handle) {
    AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

function focusWebElement(ref: React.RefObject<any>) {
  if (!ref.current) return;
  const el = ref.current;
  if (typeof el.focus === "function") {
    if (
      el.tabIndex === undefined ||
      el.tabIndex === null ||
      el.tabIndex < 0
    ) {
      el.tabIndex = -1;
    }
    el.focus();
  }
}

export function useFocusTrap({ visible, onDismiss }: UseFocusTrapOptions) {
  const focusTargetRef = useRef<any>(null);
  const triggerRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const previouslyFocusedWeb = useRef<HTMLElement | null>(null);
  const previouslyFocusedNative = useRef<any>(null);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      if (Platform.OS === "web") {
        previouslyFocusedWeb.current = document.activeElement as HTMLElement;
      } else if (triggerRef.current) {
        previouslyFocusedNative.current = triggerRef.current;
      }

      const timer = setTimeout(() => {
        if (focusTargetRef.current) {
          if (Platform.OS === "web") {
            focusWebElement(focusTargetRef);
          } else {
            setNativeFocus(focusTargetRef);
          }
        }
      }, 100);

      wasVisible.current = true;
      return () => clearTimeout(timer);
    } else if (!visible && wasVisible.current) {
      wasVisible.current = false;

      if (Platform.OS === "web" && previouslyFocusedWeb.current) {
        const el = previouslyFocusedWeb.current;
        setTimeout(() => {
          if (
            el &&
            typeof el.focus === "function" &&
            document.body.contains(el)
          ) {
            el.focus();
          }
        }, 50);
        previouslyFocusedWeb.current = null;
      } else if (Platform.OS !== "web") {
        const restoreTarget =
          triggerRef.current || previouslyFocusedNative.current;
        if (restoreTarget) {
          setTimeout(() => {
            setNativeFocus({ current: restoreTarget });
          }, 50);
        }
        previouslyFocusedNative.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableSelectors =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = container.querySelectorAll?.(focusableSelectors);
      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0] as HTMLElement;
      const last =
        focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    if (typeof container.addEventListener === "function") {
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible]);

  const onAccessibilityEscape = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  return {
    focusTargetRef,
    triggerRef,
    containerRef,
    onAccessibilityEscape,
  };
}
