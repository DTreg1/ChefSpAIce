import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  variant?: "slide" | "scale" | "fade" | "flip";
}

const cardVariants = {
  slide: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    hover: { x: 5 },
  },
  scale: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.05 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    hover: { opacity: 0.95 },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    hover: { rotateY: 5 },
  },
};

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hover = true,
  variant = "scale",
}: AnimatedCardProps) {
  const selectedVariant = cardVariants[variant];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover={hover ? "hover" : undefined}
      variants={selectedVariant}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn("relative transition-all", className)}
    >
      {children}
    </motion.div>
  );
}
