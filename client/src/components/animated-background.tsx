import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  path: "up" | "diagonal" | "zigzag";
  color: string;
}

interface AnimatedBackgroundProps {
  variant?: "gradient" | "particles" | "both";
  gradientType?: "primary" | "secondary" | "vibrant" | "soft";
  particleCount?: number;
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedBackground({
  variant = "both",
  gradientType = "soft",
  particleCount = 20,
  className,
  children,
}: AnimatedBackgroundProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = [
      "hsla(142, 70%, 45%, 0.3)",
      "hsla(22, 92%, 56%, 0.3)",
      "hsla(291, 70%, 50%, 0.3)",
      "hsla(42, 93%, 56%, 0.3)",
    ];

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 10,
      path: ["up", "diagonal", "zigzag"][Math.floor(Math.random() * 3)] as Particle["path"],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(newParticles);
  }, [particleCount]);

  const gradientClasses = {
    primary: "gradient-animate",
    secondary: "bg-gradient-to-br from-orange-400/10 via-amber-500/10 to-yellow-400/10",
    vibrant: "gradient-animate",
    soft: "bg-gradient-to-br from-emerald-400/5 via-orange-400/5 to-purple-500/5",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 overflow-hidden pointer-events-none",
        className
      )}
    >
      {/* Animated gradient background */}
      {(variant === "gradient" || variant === "both") && (
        <div
          className={cn(
            "absolute inset-0 opacity-50",
            gradientClasses[gradientType]
          )}
        />
      )}

      {/* Floating particles */}
      {(variant === "particles" || variant === "both") && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-float-up"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: particle.color,
                borderRadius: "50%",
                filter: "blur(1px)",
                animation: `${
                  particle.path === "up"
                    ? "float-up"
                    : particle.path === "diagonal"
                    ? "float-diagonal"
                    : "float-up"
                } ${particle.duration}s ${particle.delay}s linear infinite`,
                boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      {children}
    </div>
  );
}