import type { Metadata } from 'next';
import { AdBanner, AdInline } from '@/components/ads';
import { SiteShell } from '@/components/layouts/site-shell';
import { adsConfig } from '@/config/ads';
import { siteConfig } from '@/config/site';
import { ImageWorkflow } from '@/features/images/components/image-workflow';

export const metadata: Metadata = {
  title: siteConfig.pages.images.title,
  description: siteConfig.pages.images.description,
  alternates: {
    canonical: '/images',
  },
};

export default function ImagesPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <AdBanner
          slot={adsConfig.slots.homeTop}
          ariaLabel="Top banner ad"
          className="mb-2"
        />

        <ImageWorkflow />

        <AdInline
          slot={adsConfig.slots.inline}
          ariaLabel="Inline ad"
          className="mt-6"
        />
      </div>
    </SiteShell>
  );
}
