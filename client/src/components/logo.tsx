import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

const sizeClasses = {
  sm: {
    container: "w-6 h-6",
    icon: "w-3 h-3",
    text: "text-sm",
  },
  md: {
    container: "w-8 h-8",
    icon: "w-4 h-4",
    text: "text-base",
  },
  lg: {
    container: "w-10 h-10",
    icon: "w-6 h-6",
    text: "text-xl",
  },
  xl: {
    container: "w-12 h-12",
    icon: "w-7 h-7",
    text: "text-2xl",
  },
};

export function Logo({
  size = "md",
  showText = false,
  className,
  iconClassName,
  textClassName,
}: LogoProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          sizes.container,
          "rounded-xl bg-gradient-to-br from-primary to-primary/5 flex items-center justify-center shadow-lg glow-primary",
          iconClassName,
        )}
      >
        <ChefHat className={cn(sizes.icon, "text-primary-foreground")} />
      </div>
      {!!showText && (
        <h1
          className={cn(
            sizes.text,
            "font-semibold text-gradient-primary font-sans",
            textClassName,
          )}
        >
          ChefSpAIce
        </h1>
      )}
    </div>
  );
}
