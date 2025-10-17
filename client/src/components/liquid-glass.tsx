/**
 * Liquid Glass Style Button Component
 *
 * Creates a beautiful button with liquid glass effect inspired by modern design trends.
 * Uses glassmorphism with backdrop blur, transparency, and subtle liquid-like animations.
 * Perfect for creating modern, premium-looking app interfaces.
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { useVisualEffects } from "@/hooks/useVisualEffects";
import { hapticButton } from "@/lib/haptics";

interface LiquidGlassButtonProps {
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
  variant?: "colored" | "clear";
  shape?: "cube" | "bubble";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  textDirection?: "vertical" | "horizontal";
  onClick?: () => void;
  className?: string;
  disableAnimation?: boolean;
  showTitle?: boolean;
  enableHaptics?: boolean;
}

/**
 * Liquid Glass Style Button
 * Features the liquid glass effect with beautiful gradients and hover animations
 */
export function LiquidGlassButton({
  icon: Icon,
  title,
  description,
  colorScheme = "primary",
  variant = "clear",
  shape = "cube",
  size = "sm",
  textDirection = "vertical",
  onClick,
  className = "bg-gradient-to-br from-lime-950/50 to-transparent",
  disableAnimation = true,
  showTitle = false,
  enableHaptics = true,
}: LiquidGlassButtonProps) {
  const visualEffectsEnabled = useVisualEffects();

  // Handle click with haptic feedback
  const handleClick = () => {
    if (enableHaptics) {
      hapticButton();
    }
    onClick?.();
  };

  // Size variants for the icon container - ensuring perfect squares
  const sizeClasses = {
    xs: "w-8 h-8",
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  // Container height variants to accommodate different button sizes
  const containerHeights = {
    xs: "h-10 w-full",
    sm: "h-20 w-full",
    md: "h-20 w-full",
    lg: "h-28 w-full",
    xl: "h-36 w-full",
  };

  // Theme color schemes mapping to CSS classes
  const themeColorClasses = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
    destructive: "bg-destructive",
    muted: "bg-muted",
    custom: "bg-gradient-to-b from-primary to-transparent", // Uses gradientFrom/gradientTo
  };

  // Determine if we should use theme colors or custom gradient
  const useThemeColors = colorScheme !== "custom";
  const backgroundClass = useThemeColors ? themeColorClasses[colorScheme] : "";

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

  // Icon size variants
  const iconSizes = {
    xs: "w-4 h-4",
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  // Rounded corner variants for cube shape - proportional to size
  const roundedCorners = {
    xs: "rounded-lg", // 8px - appropriate for 32px container
    sm: "rounded-xl", // 12px - appropriate for 56px container
    md: "rounded-2xl", // 16px - appropriate for 80px container
    lg: "rounded-2xl", // 16px - appropriate for 96px container
    xl: "rounded-3xl", // 24px - appropriate for 128px container
  };

  // Text size variants
  const textSizes = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  // Hover animation movement variants - more pronounced upward movement
  // Each button moves up significantly to create a lifting effect
  const hoverMovement = {
    xs: "group-hover:-translate-y-3", // 12px up - creates lift effect
    sm: "group-hover:-translate-y-3", // 12px up - creates lift effect
    md: "group-hover:-translate-y-3", // 12px up - creates lift effect
    lg: "group-hover:-translate-y-3", // 12px up - creates lift effect
    xl: "group-hover:-translate-y-3", // 12px up - creates lift effect
  };

  if (textDirection === "horizontal") {
    return (
      <div
        className={`liquid-glass-app-icon flex items-center cursor-pointer rounded-lg ${shouldDisableAnimation ? "" : "group"} gap-2 ${className}`}
        onClick={handleClick}
      >
        {/* Main Glass Icon Container */}
        <div
          className={` self-start
            ${variant === "clear" ? "liquid-glass-app-icon-clear" : "liquid-glass-app-icon"}
            ${shouldDisableAnimation ? "no-animation" : ""}
            ${sizeClasses[size]} 
            ${shape === "bubble" ? "rounded-full" : roundedCorners[size]}
            ${useThemeColors ? backgroundClass : ""}
            flex
            items-center 
            justify-center
            ${shouldDisableAnimation ? "" : "transition-transform duration-300 ease-out"}
            shadow-xl drop-shadow-lg
            flex-shrink-0
          `}
        >
          {/* Icon */}
          <Icon
            className={`
              ${iconSizes[size]} 
              ${variant === "clear" ? "text-foreground" : "text-white"}
            `}
            strokeWidth={1.5}
          />
        </div>

        {/* Title and Description positioned to the right - horizontal layout shows/hides based on showTitle */}
        {title && showTitle && (
          <div className="flex flex-col gap-0.5">
            <span
              className={`
                ${textSizes[size]} 
                text-left
                font-medium
                ${shouldDisableAnimation ? "" : "group-hover:text-primary transition-all duration-300 ease-out"}
                leading-tight
              `}
              style={{
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
              }}
            >
              {title}
            </span>
            {description && (
              <span
                className="text-[10px] text-muted-foreground opacity-80 leading-tight text-left"
                style={{
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                }}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`liquid-glass-app-icon relative flex flex-col items-center justify-center cursor-pointer ${shouldDisableAnimation ? "" : "group"} ${containerHeights[size]} ${className}`}
      onClick={handleClick}
    >
      {/* Main Glass Icon Container */}
      <div
        className={`
          ${variant === "clear" ? "liquid-glass-container-clear" : "liquid-glass-container"}
          ${shouldDisableAnimation ? "no-animation" : ""}
          ${sizeClasses[size]} 
          ${shape === "bubble" ? "rounded-full" : roundedCorners[size]}
          ${useThemeColors && variant === "colored" ? backgroundClass : ""}
          flex 
          items-center 
          justify-center
          ${shouldDisableAnimation ? "" : "transition-transform duration-300 ease-out"}
          shadow-xl drop-shadow-lg
          mx-auto
          mb-1
          z-10
          ${shouldDisableAnimation ? "" : hoverMovement[size]}
        `}
      >
        {/* Icon */}
        <Icon
          className={`
            ${iconSizes[size]} 
            ${variant === "clear" ? "text-foreground" : "text-white"}
          `}
          strokeWidth={1.5}
        />
      </div>

      {/* App Title and Description - below the icon */}
      {/* Vertical layout: title hidden by default (opacity-0), revealed on hover when showTitle=true */}
      {title && showTitle && (
        <div
          className={`
            text-center 
            ${shouldDisableAnimation ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all duration-300 ease-out"}
            max-w-20
            leading-tight
            z-5
            flex flex-col gap-0.5
            -mt-2
            ${shouldDisableAnimation ? "" : "group-hover:translate-y-1"}
          `}
        >
          <span
            className={`
              ${textSizes[size]} 
              font-medium 
              block w-full text-center
            `}
            style={{
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            }}
          >
            {title}
          </span>
          {description && (
            <span
              className="text-xs text-muted-foreground opacity-80 leading-tight block w-full text-center"
              style={{
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
