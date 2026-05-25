'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardPaste, Link2, Loader2 } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { urlFormSchema, type UrlFormValues } from '@/lib/validations/url.schema';
import { cn } from '@/lib/utils';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  className?: string;
}

export interface UrlInputHandle {
  setUrl: (url: string, options?: { autoSubmit?: boolean }) => void;
}

export const UrlInput = forwardRef<UrlInputHandle, UrlInputProps>(
  function UrlInput({ onSubmit, isLoading, className }, ref) {
    const {
      register,
      handleSubmit,
      setValue,
      getValues,
      formState: { errors },
    } = useForm<UrlFormValues>({
      resolver: zodResolver(urlFormSchema),
      defaultValues: { url: '' },
    });

    useImperativeHandle(
      ref,
      () => ({
        setUrl: (url, options) => {
          setValue('url', url, { shouldValidate: true, shouldDirty: true });
          if (options?.autoSubmit) {
            onSubmit(url);
          }
        },
      }),
      [setValue, onSubmit],
    );

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
          toast.error('Clipboard is empty');
          return;
        }
        setValue('url', text.trim(), { shouldValidate: true, shouldDirty: true });
        toast.success('URL pasted from clipboard');
      } catch {
        toast.error('Unable to read clipboard');
      }
    };

    return (
      <form
        onSubmit={handleSubmit((values) => onSubmit(values.url))}
        className={cn('space-y-3', className)}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register('url')}
              placeholder="Paste a YouTube, TikTok, Instagram, Facebook, Vimeo, or X URL"
              className="pl-10"
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePaste}
              disabled={isLoading}
              className="shrink-0"
            >
              <ClipboardPaste className="h-4 w-4" />
              Paste
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !getValues('url')}
              className="shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch'
              )}
            </Button>
          </div>
        </div>
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
      </form>
    );
  },
);
