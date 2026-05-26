import { AdBanner, AdInline } from '@/components/ads';
import { SiteShell } from '@/components/layouts/site-shell';
import { adsConfig } from '@/config/ads';
import { DownloadWorkflow } from '@/features/downloads/components/download-workflow';

export default function HomePage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <AdBanner
          slot={adsConfig.slots.homeTop}
          ariaLabel="Top banner ad"
          className="mb-2"
        />

        <DownloadWorkflow />

        <AdInline
          slot={adsConfig.slots.inline}
          ariaLabel="Inline ad"
          className="mt-6"
        />
      </div>
    </SiteShell>
  );
}
