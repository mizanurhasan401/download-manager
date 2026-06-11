import type { Metadata } from 'next';
import { AdBanner, AdInline } from '@/components/ads';
import { SiteShell } from '@/components/layouts/site-shell';
import { adsConfig } from '@/config/ads';
import { siteConfig } from '@/config/site';
import { DownloadWorkflow } from '@/features/downloads/components/download-workflow';

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.pages.home.title,
  },
  description: siteConfig.pages.home.description,
  alternates: {
    canonical: '/',
  },
};

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
