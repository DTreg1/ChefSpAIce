/**
 * Liquid Glass Style Button Component
 *
 * Wraps the Shadcn Button component with liquid glass effect and Framer Motion animations.
 * Respects design system button variants, sizes, and accessibility while adding premium styling.
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useVisualEffects } from "@/hooks/useVisualEffects";
import { hapticButton } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface LiquidGlassButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  icon: LucideIcon;
  title?: string;
  description?: string;
  colorScheme?:
    | "primary"
    | "secondary"
    | "accent"
    | "destructive"
    | "muted"
    | "custom";
  glassVariant?: "colored" | "clear";
  shape?: "cube" | "bubble";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  textDirection?: "vertical" | "horizontal";
  disableAnimation?: boolean;
  showTitle?: boolean;
  enableHaptics?: boolean;
}

/**
 * Liquid Glass Style Button
 * Wraps Shadcn Button with liquid glass effect and Framer Motion animations.
 * Respects design system button sizing, variants, and accessibility.
 */
export function LiquidGlassButton({
  icon: Icon,
  title,
  description,
  colorScheme = "primary",
  glassVariant = "clear",
  shape = "cube",
  size = "sm",
  textDirection = "vertical",
  className,
  disableAnimation = true,
  showTitle = false,
  enableHaptics = true,
  onClick,
  ...buttonProps
}: LiquidGlassButtonProps) {
  const visualEffectsEnabled = useVisualEffects();

  // Handle click with haptic feedback
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enableHaptics) {
      hapticButton();
    }
    onClick?.();
  };

  // Map custom sizes to Button component sizes
  const buttonSizeMap = {
    xs: "sm" as const,
    sm: "sm" as const,
    md: "default" as const,
    lg: "lg" as const,
    xl: "lg" as const,
  };

  // Map color schemes to Button variants
  const buttonVariantMap = {
    primary: "default" as const,
    secondary: "secondary" as const,
    accent: "outline" as const,
    destructive: "destructive" as const,
    muted: "ghost" as const,
    custom: "ghost" as const,
  };

  // Icon size variants
  const iconSizes = {
    xs: "w-4 h-4",
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
    xl: "w-8 h-8",
  };

  // Rounded corner variants for shape
  const shapeClass = shape === "bubble" ? "rounded-full" : "rounded-md";

  // Animation logic:
  // - showTitle={false} → NO animation (no title to reveal)
  // - showTitle={true} + textDirection="horizontal" → NO animation (title always visible)
  // - showTitle={true} + textDirection="vertical" → WITH animation (reveals hidden title)
  // - visualEffectsEnabled={false} → NO animation (user preference)
  const shouldDisableAnimation =
    disableAnimation ||
    !showTitle ||
    textDirection === "horizontal" ||
    !visualEffectsEnabled;

  // Liquid glass styling classes
  const glassClasses = cn(
    glassVariant === "clear"
      ? "liquid-glass-app-icon-clear"
      : "liquid-glass-container",
    className
  );

  // Horizontal layout with icon and text side-by-side
  if (textDirection === "horizontal") {
    return (
      <div className="flex items-center gap-2">
        <Button
          {...buttonProps}
          size={buttonSizeMap[size]}
          variant={buttonVariantMap[colorScheme]}
          onClick={handleClick}
          className={cn(
            "p-0 w-auto h-auto",
            shapeClass,
            glassClasses
          )}
          data-testid={`button-liquid-glass-${title?.toLowerCase()?.replace(/\s+/g, '-')}`}
        >
          <Icon
            className={iconSizes[size]}
            strokeWidth={1.5}
          />
        </Button>

        {title && showTitle && (
          <motion.div
            className="flex flex-col gap-0.5"
            initial={!shouldDisableAnimation ? { opacity: 0 } : { opacity: 1 }}
            animate={!shouldDisableAnimation ? { opacity: 1 } : { opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="text-sm font-medium leading-tight"
              style={{
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
              }}
            >
              {title}
            </span>
            {description && (
              <span
                className="text-xs text-muted-foreground opacity-80 leading-tight"
                style={{
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                }}
              >
                {description}
              </span>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // Vertical layout with icon above text
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-1"
      initial={!shouldDisableAnimation ? { y: 0 } : { y: 0 }}
      whileHover={!shouldDisableAnimation ? { y: -3 } : {}}
      transition={{ duration: 0.3, type: "spring", stiffness: 400 }}
    >
      <Button
        {...buttonProps}
        size="icon"
        variant={buttonVariantMap[colorScheme]}
        onClick={handleClick}
        className={cn(
          shapeClass,
          glassClasses,
          "shadow-xl drop-shadow-lg"
        )}
        data-testid={`button-liquid-glass-${title?.toLowerCase()?.replace(/\s+/g, '-')}`}
      >
        <Icon
          className={iconSizes[size]}
          strokeWidth={1.5}
        />
      </Button>

      {title && showTitle && (
        <motion.div
          className="text-center flex flex-col gap-0.5"
          initial={!shouldDisableAnimation ? { opacity: 0, y: -4 } : { opacity: 1, y: 0 }}
          animate={!shouldDisableAnimation ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <span
            className="text-xs font-medium leading-tight"
            style={{
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            }}
          >
            {title}
          </span>
          {description && (
            <span
              className="text-xs text-muted-foreground opacity-80 leading-tight"
              style={{
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
              }}
            >
              {description}
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
