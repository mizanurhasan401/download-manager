import { AdBanner, AdInline } from '@/components/ads';
import { SiteShell } from '@/components/layouts/site-shell';
import { adsConfig } from '@/config/ads';
import { ImageWorkflow } from '@/features/images/components/image-workflow';

export const metadata = { title: 'Image Tools' };

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
