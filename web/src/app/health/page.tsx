import type { Metadata } from 'next';
import { SiteShell } from '@/components/layouts/site-shell';
import { PageHeader } from '@/components/shared/page-header';
import { siteConfig } from '@/config/site';
import { HealthPanel } from '@/features/health/components/health-panel';

export const metadata: Metadata = {
  title: siteConfig.pages.health.title,
  description: siteConfig.pages.health.description,
  alternates: {
    canonical: '/health',
  },
};

export default function HealthPage() {
  return (
    <SiteShell>
      <div className="space-y-8">
        <PageHeader
          title="System health"
          description="Monitor the status of the VidGrab API and its dependencies."
        />
        <HealthPanel />
      </div>
    </SiteShell>
  );
}
