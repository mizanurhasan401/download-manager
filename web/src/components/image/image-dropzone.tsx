'use client';

import { ImageIcon, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeMb?: number;
}

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif';

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
      if (!acceptedTypes.includes(incoming.type)) {
        setErrorMessage('Unsupported file type. Use PNG, JPG, WebP or AVIF.');
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

  return (
    <div className="space-y-2">
      <div
        onClick={file ? undefined : handleBrowse}
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
          'group relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 px-6 py-8 text-center transition-colors',
          dragOver && 'border-primary bg-primary/5',
          file && 'cursor-default border-solid bg-background',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {file && previewUrl ? (
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected"
              className="h-32 w-32 rounded-xl object-cover shadow-sm"
            />
            <div className="flex-1 space-y-2 text-left">
              <p className="break-all text-sm font-medium">{file.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{file.type || 'unknown type'}</span>
                <span>•</span>
                <span>{formatBytes(file.size)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
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
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                <span className="text-primary">Click to upload</span> or drag &amp;
                drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG · JPG · WebP · AVIF — up to {maxSizeMb} MB
              </p>
            </div>
            <ImageIcon className="absolute right-4 top-4 h-4 w-4 text-muted-foreground/40" />
          </>
        )}

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
