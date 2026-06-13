'use client';

import { UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeMb?: number;
  variant?: 'hero' | 'compact';
}

const DEFAULT_ACCEPT =
  'image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif,image/gif,image/tiff,image/bmp,image/x-ms-bmp,.heic,.heif,.gif,.tiff,.tif,.bmp';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageDropzone({
  file,
  onSelect,
  disabled = false,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 25,
  variant = 'hero',
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const typeOk =
        acceptedTypes.includes(incoming.type) ||
        acceptedTypes.some(
          (t) => t.startsWith('.') && incoming.name.toLowerCase().endsWith(t),
        );
      if (!typeOk) {
        setErrorMessage('Unsupported file type. Use PNG, JPG, WebP, AVIF, HEIC, GIF, TIFF, or BMP.');
        return;
      }
      onSelect(incoming);
    },
    [accept, maxSizeMb, onSelect],
  );

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onSelect(null);
  };

  if (file && previewUrl) {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border/60 bg-muted/30',
            disabled && 'opacity-60',
          )}
        >
          <div className="flex aspect-square w-full items-center justify-center bg-[linear-gradient(45deg,#2a2a2a_25%,transparent_25%),linear-gradient(-45deg,#2a2a2a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2a2a2a_75%),linear-gradient(-45deg,transparent_75%,#2a2a2a_75%)] bg-size-[20px_20px] bg-position-[0_0,0_10px,10px_-10px,-10px_0px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="break-all text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.type || 'unknown type'} · {formatBytes(file.size)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowse}
            disabled={disabled}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
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
        onClick={handleBrowse}
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
            <span className="text-primary">Click to upload</span> or drag &amp; drop
          </p>
          <p className="text-xs text-muted-foreground">
            PNG · JPG · WebP · AVIF — up to {maxSizeMb} MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
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
