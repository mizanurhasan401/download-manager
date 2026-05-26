'use client';

import { ImagePlus, Maximize2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { BackgroundRemovePanel } from '@/components/image/background-remove-panel';
import { ConvertPanel } from '@/components/image/convert-panel';
import { ImageDropzone } from '@/components/image/image-dropzone';
import { ImageJobProgress } from '@/components/image/image-job-progress';
import { ResizePanel } from '@/components/image/resize-panel';
import { useCreateImageJob } from '@/features/images/hooks/useCreateImageJob';
import type {
  CreateImageJobBody,
  ImageOperation,
  OutputFormat,
  ResizeFit,
} from '@/types/image';

type Tab = 'CONVERT' | 'RESIZE' | 'REMOVE_BACKGROUND';

interface ResizeState {
  width: string;
  height: string;
  fit: ResizeFit;
  format: OutputFormat | 'auto';
}

interface ConvertState {
  format: OutputFormat;
  quality: number;
}

export function ImageWorkflow() {
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<Tab>('CONVERT');
  const [convertState, setConvertState] = useState<ConvertState>({
    format: 'webp',
    quality: 85,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    width: '1024',
    height: '',
    fit: 'cover',
    format: 'auto',
  });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createJob = useCreateImageJob((job) => setActiveJobId(job.id));

  const reset = () => {
    setActiveJobId(null);
    setFile(null);
  };

  const buildBody = (): CreateImageJobBody | { error: string } => {
    const operation = tab as ImageOperation;
    if (operation === 'CONVERT') {
      return {
        operation,
        format: convertState.format,
        quality: convertState.quality,
      };
    }
    if (operation === 'RESIZE') {
      const w = resizeState.width ? parseInt(resizeState.width, 10) : undefined;
      const h = resizeState.height ? parseInt(resizeState.height, 10) : undefined;
      if (!w && !h) {
        return { error: 'Provide width or height to resize.' };
      }
      return {
        operation,
        width: w,
        height: h,
        fit: resizeState.fit,
        format:
          resizeState.format === 'auto' ? undefined : resizeState.format,
      };
    }
    return { operation: 'REMOVE_BACKGROUND' };
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = () => {
    setSubmitError(null);
    if (!file) {
      setSubmitError('Please choose an image first.');
      return;
    }
    const body = buildBody();
    if ('error' in body) {
      setSubmitError(body.error);
      return;
    }
    createJob.mutate({ file, body });
  };

  const submitting = createJob.isPending;
  const disabled = !file || submitting || Boolean(activeJobId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Tools"
        description="Convert, resize, and remove backgrounds. Powered by Sharp and on-device AI — your files never leave this machine."
      />

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4 w-4" />
            1 — Select an image
          </CardTitle>
          <CardDescription>PNG, JPG, WebP or AVIF — up to 25 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageDropzone
            file={file}
            onSelect={(f) => {
              setFile(f);
              setSubmitError(null);
              setActiveJobId(null);
            }}
            disabled={submitting || Boolean(activeJobId)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">2 — Choose what to do</CardTitle>
          <CardDescription>
            Each tab is its own operation. Run as many as you want, one job at a
            time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab);
              setSubmitError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="CONVERT" className="gap-2">
                <ImagePlus className="h-4 w-4" />
                Convert
              </TabsTrigger>
              <TabsTrigger value="RESIZE" className="gap-2">
                <Maximize2 className="h-4 w-4" />
                Resize
              </TabsTrigger>
              <TabsTrigger value="REMOVE_BACKGROUND" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Remove BG
              </TabsTrigger>
            </TabsList>

            <TabsContent value="CONVERT">
              <ConvertPanel
                format={convertState.format}
                quality={convertState.quality}
                onChange={setConvertState}
              />
            </TabsContent>
            <TabsContent value="RESIZE">
              <ResizePanel
                width={resizeState.width}
                height={resizeState.height}
                fit={resizeState.fit}
                format={resizeState.format}
                onChange={setResizeState}
              />
            </TabsContent>
            <TabsContent value="REMOVE_BACKGROUND">
              <BackgroundRemovePanel />
            </TabsContent>
          </Tabs>

          {submitError && (
            <p className="mt-4 text-sm text-destructive">{submitError}</p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={reset}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={disabled}>
              {submitting ? 'Starting…' : 'Process image'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeJobId && (
        <ImageJobProgress jobId={activeJobId} onReset={reset} />
      )}
    </div>
  );
}
