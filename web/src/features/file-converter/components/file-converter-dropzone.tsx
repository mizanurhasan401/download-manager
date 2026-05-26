'use client';

import { FileText, UploadCloud, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn, formatBytes } from '@/lib/utils';
import {
  ALL_ACCEPTED_EXTENSIONS,
  ALL_ACCEPTED_MIMES,
  detectSourceFormat,
} from '@/features/file-converter/utils/conversion-matrix';

interface FileConverterDropzoneProps {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  maxSizeMb?: number;
  variant?: 'hero' | 'compact';
}

const ACCEPTED_HINT = 'PDF · DOCX · PPTX · XLSX · TXT · PNG · JPG · WebP';

export function FileConverterDropzone({
  file,
  onSelect,
  disabled = false,
  maxSizeMb = 50,
  variant = 'hero',
}: FileConverterDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndSet = useCallback(
    (incoming: File | null) => {
      setErrorMessage(null);
      if (!incoming) {
        onSelect(null);
        return;
      }
      const sizeLimit = maxSizeMb * 1024 * 1024;
      if (incoming.size > sizeLimit) {
        setErrorMessage(`File exceeds ${maxSizeMb} MB limit`);
        return;
      }
      const sourceFormat = detectSourceFormat(incoming);
      if (!sourceFormat) {
        setErrorMessage(`Unsupported file type. Accepted: ${ACCEPTED_HINT}`);
        return;
      }
      onSelect(incoming);
    },
    [maxSizeMb, onSelect],
  );

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onSelect(null);
  };

  const acceptAttr = `${ALL_ACCEPTED_MIMES},${ALL_ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}`;

  if (file) {
    const sourceFormat = detectSourceFormat(file);
    return (
      <div className="space-y-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4',
            disabled && 'opacity-60',
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {sourceFormat ?? '—'} · {formatBytes(file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowse}
            disabled={disabled}
          >
            Replace file
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            validateAndSet(selected);
          }}
          disabled={disabled}
        />

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && handleBrowse()}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) validateAndSet(dropped);
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 px-6 text-center transition-colors',
          variant === 'hero' ? 'min-h-72 py-12 sm:min-h-80' : 'min-h-44 py-8',
          dragOver && 'border-primary bg-primary/5',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-primary/10',
            variant === 'hero' ? 'h-16 w-16' : 'h-12 w-12',
          )}
        >
          <UploadCloud
            className={cn(
              'text-primary',
              variant === 'hero' ? 'h-8 w-8' : 'h-6 w-6',
            )}
          />
        </div>
        <div className="space-y-1.5">
          <p
            className={cn(
              'font-medium',
              variant === 'hero' ? 'text-base' : 'text-sm',
            )}
          >
            <span className="text-primary">Click to upload</span> or drag &amp;
            drop
          </p>
          <p className="text-xs text-muted-foreground">
            {ACCEPTED_HINT} — up to {maxSizeMb} MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            validateAndSet(selected);
          }}
          disabled={disabled}
        />
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
