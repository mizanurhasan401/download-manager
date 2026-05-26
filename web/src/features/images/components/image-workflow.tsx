'use client';

import { ImagePlus, Maximize2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  const dropzoneDisabled = submitting || Boolean(activeJobId);

  const handleSelectFile = (f: File | null) => {
    setFile(f);
    setSubmitError(null);
    setActiveJobId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Image Tools"
        description="Convert, resize, remove backgrounds — all on this machine."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {!file ? (
            <ImageDropzone
              file={null}
              onSelect={handleSelectFile}
              disabled={dropzoneDisabled}
              variant="hero"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ImageDropzone
                file={file}
                onSelect={handleSelectFile}
                disabled={dropzoneDisabled}
                variant="compact"
              />

              <div className="flex flex-col gap-4">
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
                      <span className="hidden sm:inline">Convert</span>
                    </TabsTrigger>
                    <TabsTrigger value="RESIZE" className="gap-2">
                      <Maximize2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Resize</span>
                    </TabsTrigger>
                    <TabsTrigger value="REMOVE_BACKGROUND" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Remove BG</span>
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
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <div className="mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={reset}
                    disabled={submitting}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled}
                    className="sm:min-w-40"
                  >
                    {submitting ? 'Starting…' : 'Process image'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {activeJobId && <ImageJobProgress jobId={activeJobId} onReset={reset} />}
    </div>
  );
}
