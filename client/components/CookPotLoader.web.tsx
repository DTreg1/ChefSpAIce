import React from "react";

export interface CookPotLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "success" | "warning" | "destructive" | "muted" | "inherit";
  text?: string;
  textClassName?: string;
  className?: string;
}

const sizeMap: Record<string, { spinner: string; text: string }> = {
  xs: { spinner: "w-4 h-4 border-2", text: "text-xs" },
  sm: { spinner: "w-6 h-6 border-2", text: "text-sm" },
  md: { spinner: "w-8 h-8 border-3", text: "text-base" },
  lg: { spinner: "w-10 h-10 border-4", text: "text-lg" },
  xl: { spinner: "w-12 h-12 border-4", text: "text-xl" },
};

const colorMap: Record<string, string> = {
  primary: "border-primary/30 border-t-primary",
  success: "border-success/30 border-t-success",
  warning: "border-warning/30 border-t-warning",
  destructive: "border-destructive/30 border-t-destructive",
  muted: "border-muted/30 border-t-muted-foreground",
  inherit: "border-current/30 border-t-current",
};

export function CookPotLoader({
  size = "md",
  color = "primary",
  text,
  textClassName,
  className,
}: CookPotLoaderProps) {
  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className || ""}`}>
      <div
        className={`rounded-full animate-spin ${sizeMap[size].spinner} ${colorMap[color]}`}
      />
      {text ? (
        <span className={`text-center whitespace-nowrap ${sizeMap[size].text} ${textClassName || ""}`}>
          {text}
        </span>
      ) : null}
    </div>
  );
}

export default CookPotLoader;
