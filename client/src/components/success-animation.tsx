import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  message?: string;
  showConfetti?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({
  message = "Success!",
  showConfetti = true,
  className,
  onComplete,
}: SuccessAnimationProps) {
  useEffect(() => {
    if (showConfetti) {
      // Dynamically import confetti only when needed
      import("canvas-confetti").then(({ default: confetti }) => {
        // Trigger confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        const interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(interval);
            onComplete?.();
            return;
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Shoot confetti from left
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ["#22c55e", "#fb923c", "#a855f7", "#fbbf24", "#ef4444"],
          });
          
          // Shoot confetti from right
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ["#22c55e", "#fb923c", "#a855f7", "#fbbf24", "#ef4444"],
          });
        }, 250);

        return () => clearInterval(interval);
      }).catch(console.error);
    } else {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, onComplete]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-8",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl glow-primary">
          <Check className="w-10 h-10 text-primary-foreground" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-primary/20"
        />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-gradient-primary mb-2">{message}</h2>
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>Great job!</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Utility function to trigger confetti independently
export async function triggerConfetti(options?: {
  duration?: number;
  particleCount?: number;
  colors?: string[];
}) {
  const {
    duration = 2000,
    particleCount = 100,
    colors = ["#22c55e", "#fb923c", "#a855f7", "#fbbf24", "#ef4444"],
  } = options || {};

  // Dynamically import confetti
  const { default: confetti } = await import("canvas-confetti");

  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}