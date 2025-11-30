import { CheckCircle2 } from "lucide-react";

interface BulletSummaryProps {
  bullets: string[] | string;
  className?: string;
}

export default function BulletSummary({ bullets, className = "" }: BulletSummaryProps) {
  // Parse bullets if they come as a single string with newlines
  const parsedBullets = typeof bullets === 'string' 
    ? bullets.split('\n').filter((b: string) => b.trim())
    : bullets;

  return (
    <ul className={`space-y-2 ${className}`} data-testid="list-bullet-summary">
      {parsedBullets.map((bullet: string, index: number) => {
        // Remove bullet point characters if they exist
        const cleanBullet = bullet.replace(/^[•\-*]\s*/, '').trim();
        
        return (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm leading-relaxed">{cleanBullet}</span>
          </li>
        );
      })}
    </ul>
  );
}