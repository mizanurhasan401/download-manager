import { SiteShell } from '@/components/layouts/site-shell';
import { PageHeader } from '@/components/shared/page-header';
import { HealthPanel } from '@/features/health/components/health-panel';

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
