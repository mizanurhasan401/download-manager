import type { Metadata } from 'next';
import { DownloadHistory } from '@/components/download/download-history';
import { SiteShell } from '@/components/layouts/site-shell';
import { PageHeader } from '@/components/shared/page-header';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: siteConfig.pages.history.title,
  description: siteConfig.pages.history.description,
  alternates: {
    canonical: '/history',
  },
};

export default function HistoryPage() {
  return (
    <SiteShell>
      <div className="space-y-8">
        <PageHeader
          title="Download history"
          description="Browse your recent downloads stored locally in this browser."
        />
        <DownloadHistory />
      </div>
    </SiteShell>
  );
}
