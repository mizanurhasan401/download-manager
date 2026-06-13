'use client';

import { FileType2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ConversionFormatSelector } from '@/features/file-converter/components/conversion-format-selector';
import { ConversionProgress } from '@/features/file-converter/components/conversion-progress';
import { FileConverterDropzone } from '@/features/file-converter/components/file-converter-dropzone';
import { useCreateConversion } from '@/features/file-converter/hooks/useCreateConversion';
import {
  detectSourceFormat,
  getAvailableTargets,
} from '@/features/file-converter/utils/conversion-matrix';
import type {
  ConversionFileFormat,
  CreateConversionBody,
} from '@/types/file-converter';

const IMAGE_TARGETS = new Set([
  'PNG',
  'JPG',
  'WEBP',
  'HEIC',
  'GIF',
  'TIFF',
]);

export function FileConverterWorkflow() {
  const [file, setFile] = useState<File | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] =
    useState<CreateConversionBody['targetFormat'] | null>(null);
  const [quality, setQuality] = useState<number>(85);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sourceFormat: ConversionFileFormat | null = useMemo(
    () => (file ? detectSourceFormat(file) : null),
    [file],
  );

  const createConversion = useCreateConversion((job) => {
    setActiveJobId(job.id);
  });

  // Auto-pick a sensible default target whenever the source format changes
  // (or the previously selected target becomes invalid). Uses the React docs'
  // "adjust state while rendering" pattern instead of useEffect, since
  // `targetFormat` is fully derivable from `sourceFormat`.
  const [prevSourceFormat, setPrevSourceFormat] = useState(sourceFormat);
  if (prevSourceFormat !== sourceFormat) {
    setPrevSourceFormat(sourceFormat);
    if (!sourceFormat) {
      setTargetFormat(null);
    } else {
      const options = getAvailableTargets(sourceFormat);
      if (options.length === 0) {
        setTargetFormat(null);
      } else if (
        !targetFormat ||
        !options.some((opt) => opt.target === targetFormat)
      ) {
        setTargetFormat(options[0].target);
      }
    }
  }

  const showQualityField =
    targetFormat !== null && IMAGE_TARGETS.has(targetFormat);

  const handleSelectFile = (f: File | null) => {
    setFile(f);
    setSubmitError(null);
    setActiveJobId(null);
  };

  const reset = () => {
    setFile(null);
    setActiveJobId(null);
    setSubmitError(null);
  };

  const handleSubmit = () => {
    setSubmitError(null);
    if (!file) {
      setSubmitError('Please choose a file first.');
      return;
    }
    if (!targetFormat) {
      setSubmitError('Please choose a target format.');
      return;
    }

    const body: CreateConversionBody = {
      targetFormat,
      ...(showQualityField ? { quality } : {}),
    };

    createConversion.mutate({ file, body });
  };

  const submitting = createConversion.isPending;
  const disabled = !file || !targetFormat || submitting || Boolean(activeJobId);
  const dropzoneDisabled = submitting || Boolean(activeJobId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Converter"
        description="Convert documents and images between formats — PDF, Word, PowerPoint, Excel, plus PNG/JPG/WebP."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {!file ? (
            <FileConverterDropzone
              file={null}
              onSelect={handleSelectFile}
              disabled={dropzoneDisabled}
              variant="hero"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <FileConverterDropzone
                file={file}
                onSelect={handleSelectFile}
                disabled={dropzoneDisabled}
                variant="compact"
              />

              <div className="flex flex-col gap-4">
                <ConversionFormatSelector
                  sourceFormat={sourceFormat}
                  targetFormat={targetFormat}
                  onTargetChange={setTargetFormat}
                  disabled={dropzoneDisabled}
                />

                {showQualityField && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="quality"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Image quality ({quality})
                    </label>
                    <input
                      id="quality"
                      type="range"
                      min={1}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                      disabled={dropzoneDisabled}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <div className="mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
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
                    <FileType2 className="h-4 w-4" />
                    {submitting ? 'Starting…' : 'Convert'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {activeJobId && (
        <ConversionProgress jobId={activeJobId} onReset={reset} />
      )}
    </div>
  );
}
