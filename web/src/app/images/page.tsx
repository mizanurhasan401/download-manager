import { SiteShell } from '@/components/layouts/site-shell';
import { ImageWorkflow } from '@/features/images/components/image-workflow';

export const metadata = {
  title: 'Image Tools',
};

export default function ImagesPage() {
  return (
    <SiteShell>
      <ImageWorkflow />
    </SiteShell>
  );
}
