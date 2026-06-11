import { cn } from '@/lib/utils';

interface SiteLogoProps {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function SiteLogo({
  className,
  iconClassName,
  showWordmark = true,
  wordmarkClassName,
}: SiteLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn('h-9 w-9 shrink-0', iconClassName)}
      >
        <rect width="40" height="40" rx="11" fill="url(#vidgrab-logo-gradient)" />
        <path
          d="M20 11v12"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M15 18l5 5 5-5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 28h14"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="vidgrab-logo-gradient"
            x1="4"
            y1="4"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight',
            wordmarkClassName,
          )}
        >
          Vid<span className="text-primary">Grab</span>
        </span>
      )}
    </span>
  );
}
