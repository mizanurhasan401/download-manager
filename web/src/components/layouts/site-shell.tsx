import { SiteHeader } from '@/components/layouts/site-header';
import { cn } from '@/lib/utils';

interface SiteShellProps {
  children: React.ReactNode;
  className?: string;
}

export function SiteShell({ children, className }: SiteShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"
      />
      <SiteHeader />
      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6', className)}>
        {children}
      </main>
    </div>
  );
}
