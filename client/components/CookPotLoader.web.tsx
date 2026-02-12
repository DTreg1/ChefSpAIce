import React from 'react';

export interface CookPotLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted' | 'inherit';
  text?: string;
  textClassName?: string;
  className?: string;
}

const sizeMap: Record<string, {
  container: string,
  potWidth: string,
  potHeight: string,
  text: string,
  steam: string
}> = {
  xs: {
    container: "w-12 h-12",
    potWidth: "w-12",
    potHeight: "h-8",
    text: "text-xs",
    steam: "w-8 h-12"
  },
  sm: {
    container: "w-16 h-16",
    potWidth: "w-16",
    potHeight: "h-10",
    text: "text-sm",
    steam: "w-10 h-16"
  },
  md: {
    container: "w-24 h-24",
    potWidth: "w-24",
    potHeight: "h-16",
    text: "text-base",
    steam: "w-16 h-20"
  },
  lg: {
    container: "w-32 h-32",
    potWidth: "w-32",
    potHeight: "h-20",
    text: "text-lg",
    steam: "w-20 h-24"
  },
  xl: {
    container: "w-40 h-40",
    potWidth: "w-40",
    potHeight: "h-28",
    text: "text-xl",
    steam: "w-24 h-28"
  }
};

const colorMap: Record<string, {
  pot: string,
  lid: string,
  steam: string,
  bubbles: string
}> = {
  primary: {
    pot: "fill-primary/20 stroke-primary",
    lid: "fill-primary-foreground",
    steam: "fill-primary/40",
    bubbles: "fill-primary-foreground/70"
  },
  success: {
    pot: "fill-success/20 stroke-success",
    lid: "fill-success-foreground",
    steam: "fill-success/40",
    bubbles: "fill-success-foreground/70"
  },
  warning: {
    pot: "fill-warning/20 stroke-warning",
    lid: "fill-warning-foreground",
    steam: "fill-warning/40",
    bubbles: "fill-warning-foreground/70"
  },
  destructive: {
    pot: "fill-destructive/20 stroke-destructive",
    lid: "fill-destructive-foreground",
    steam: "fill-destructive/40",
    bubbles: "fill-destructive-foreground/70"
  },
  muted: {
    pot: "fill-muted/20 stroke-muted",
    lid: "fill-muted-foreground",
    steam: "fill-muted/40",
    bubbles: "fill-muted-foreground/70"
  },
  inherit: {
    pot: "fill-current/20 stroke-current",
    lid: "fill-current",
    steam: "fill-current/40",
    bubbles: "fill-current/70"
  }
};

export function CookPotLoader({
  size = 'md',
  color = 'primary',
  text,
  textClassName,
  className
}: CookPotLoaderProps) {
  const displayText = text || "Prepping the Kitchen";

  return (
    <div className={`relative inline-flex flex-col items-center justify-center overflow-visible ${sizeMap[size].container} ${className || ''}`}>
      <div className="flex items-center justify-center relative">
        <svg
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          className={`overflow-visible ${sizeMap[size].potWidth} ${sizeMap[size].potHeight}`}
        >
          <rect
            x="10"
            y="50"
            width="80"
            height="50"
            rx="10"
            className={colorMap[color].pot}
            strokeWidth="4"
            strokeOpacity="1"
          />

          <path
            d="M15 70 L85 70"
            strokeWidth="2"
            stroke="#507f45"
            strokeOpacity="0.3"
            fill="none"
          />

          <path
            d="M10 55 L90 55"
            strokeWidth="2"
            stroke="#707070"
            strokeOpacity="0.7"
            fill="none"
          />

          <path
            d="M5 70 Q0 70 0 60 Q0 50 5 50"
            className={colorMap[color].pot}
            strokeWidth="4"
            fill="none"
          />
          <path
            d="M95 70 Q100 70 100 60 Q100 50 95 50"
            className={colorMap[color].pot}
            strokeWidth="4"
            fill="none"
          />

          <rect
            x="20"
            y="40"
            width="60"
            height="10"
            rx="5"
            className={colorMap[color].lid}
          />
          <circle
            cx="50"
            cy="40"
            r="7"
            className={colorMap[color].lid}
          />

          <g className="steam-group">
            <path
              d="M30 35 Q25 25 30 20 Q35 15 30 10"
              className={`${colorMap[color].steam} animate-steam-1`}
              strokeWidth="0"
              fill="none"
            >
              <animate
                attributeName="d"
                values="M30 35 Q25 25 30 20 Q35 15 30 10;
                        M30 35 Q25 25 32 18 Q36 13 32 8;
                        M30 35 Q25 25 30 20 Q35 15 30 10"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M50 35 Q45 25 50 15 Q55 5 50 0"
              className={`${colorMap[color].steam} animate-steam-2`}
              strokeWidth="0"
              fill="none"
            >
              <animate
                attributeName="d"
                values="M50 35 Q45 25 50 15 Q55 5 50 0;
                        M50 35 Q48 22 52 12 Q58 2 54 -2;
                        M50 35 Q45 25 50 15 Q55 5 50 0"
                dur="2.7s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M70 35 Q75 25 70 20 Q65 15 70 10"
              className={`${colorMap[color].steam} animate-steam-3`}
              strokeWidth="0"
              fill="none"
            >
              <animate
                attributeName="d"
                values="M70 35 Q75 25 70 20 Q65 15 70 10;
                        M70 35 Q73 23 68 16 Q63 12 68 8;
                        M70 35 Q75 25 70 20 Q65 15 70 10"
                dur="3.3s"
                repeatCount="indefinite"
              />
            </path>

            <circle
              cx="30"
              cy="12"
              r="8"
              className={`${colorMap[color].steam} animate-steam-fade`}
            >
              <animate
                attributeName="cy"
                values="12;8;12"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="8;10;8"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="50"
              cy="5"
              r="10"
              className={`${colorMap[color].steam} animate-steam-fade`}
            >
              <animate
                attributeName="cy"
                values="5;0;5"
                dur="2.7s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="10;12;10"
                dur="2.7s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="70"
              cy="12"
              r="8"
              className={`${colorMap[color].steam} animate-steam-fade`}
            >
              <animate
                attributeName="cy"
                values="12;8;12"
                dur="3.3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="8;10;8"
                dur="3.3s"
                repeatCount="indefinite"
              />
            </circle>
          </g>

          <g className="bubbles-group">
            <circle
              cx="30"
              cy="80"
              r="4"
              className={`${colorMap[color].bubbles} animate-bubble-1`}
            >
              <animate
                attributeName="cy"
                values="80;60;80"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="50"
              cy="85"
              r="3"
              className={`${colorMap[color].bubbles} animate-bubble-2`}
            >
              <animate
                attributeName="cy"
                values="85;65;85"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="70"
              cy="75"
              r="5"
              className={`${colorMap[color].bubbles} animate-bubble-3`}
            >
              <animate
                attributeName="cy"
                values="75;55;75"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>
      </div>

      <span className={`mt-2 text-center whitespace-nowrap ${sizeMap[size].text} ${textClassName || ''}`}>
        {displayText}
      </span>
    </div>
  );
}

export default CookPotLoader;
