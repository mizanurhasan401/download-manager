import { SiteShell } from '@/components/layouts/site-shell';
import { DownloadWorkflow } from '@/features/downloads/components/download-workflow';

export default function HomePage() {
  return (
    <SiteShell>
      <DownloadWorkflow />
    </SiteShell>
  );
}
