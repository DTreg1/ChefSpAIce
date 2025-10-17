import { startTransition } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  "data-testid"?: string;
}

// Custom Link component that wraps navigation in startTransition
// to prevent suspension errors with lazy-loaded routes
export function TransitionLink({ href, children, className, onClick, ...props }: TransitionLinkProps) {
  const [, setLocation] = useLocation();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Call any existing onClick handler
    if (onClick) {
      onClick(e);
    }
    
    // Wrap navigation in startTransition
    startTransition(() => {
      setLocation(href);
    });
  };

  return (
    <a 
      href={href}
      onClick={handleClick}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      {children}
    </a>
  );
}