import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  pulse?: boolean;
  glow?: boolean;
  bounce?: boolean;
}

export function MotionButton({
  children,
  className,
  variant = "primary",
  size = "default",
  pulse = false,
  glow = false,
  bounce = false,
  ...props
}: MotionButtonProps) {
  const variantClasses = {
    primary: "bg-primary text-primary-foreground border border-primary-border",
    secondary: "bg-secondary text-secondary-foreground border border-secondary-border",
    ghost: "border border-transparent",
    outline: "border [border-color:var(--button-outline)] shadow-xs",
    destructive: "bg-destructive text-destructive-foreground border border-destructive-border",
  };

  const sizeClasses = {
    default: "min-h-9 px-4 py-2",
    sm: "min-h-8 px-3 text-xs",
    lg: "min-h-10 px-8",
    icon: "h-9 w-9",
  };

  const glowClasses = glow ? 
    variant === "primary" ? "glow-primary" : 
    variant === "secondary" ? "glow-secondary" : 
    "" : "";

  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        "hover-elevate active-elevate-2 transition-morph",
        variantClasses[variant],
        sizeClasses[size],
        glowClasses,
        className
      )}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      animate={
        pulse ? {
          scale: [1, 1.05, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        } : bounce ? {
          y: [0, -5, 0],
          transition: {
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut"
          }
        } : undefined
      }
      {...props}
    >
      {children}
    </motion.button>
  );
}