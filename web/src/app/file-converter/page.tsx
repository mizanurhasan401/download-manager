import type { Metadata } from 'next';
import { AdBanner, AdInArticle } from '@/components/ads';
import { SiteShell } from '@/components/layouts/site-shell';
import { adsConfig } from '@/config/ads';
import { siteConfig } from '@/config/site';
import { FileConverterWorkflow } from '@/features/file-converter/components/file-converter-workflow';

export const metadata: Metadata = {
  title: siteConfig.pages.fileConverter.title,
  description: siteConfig.pages.fileConverter.description,
  alternates: {
    canonical: '/file-converter',
  },
};

export default function FileConverterPage() {
  return (
    <SiteShell>
      <div className="space-y-6">
        <AdBanner
          slot={adsConfig.slots.homeTop}
          ariaLabel="Top banner ad"
          className="mb-2"
        />

        <FileConverterWorkflow />

        <AdInArticle
          slot={adsConfig.slots.inArticle}
          ariaLabel="In-article ad"
          className="mt-6"
        />
      </div>
    </SiteShell>
  );
}
