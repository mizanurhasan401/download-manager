import { DownloadHistory } from '@/components/download/download-history';
import { SiteShell } from '@/components/layouts/site-shell';
import { PageHeader } from '@/components/shared/page-header';

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
