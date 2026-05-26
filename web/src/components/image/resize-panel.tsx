'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OutputFormat, ResizeFit } from '@/types/image';

interface ResizePanelProps {
  width: string;
  height: string;
  fit: ResizeFit;
  format: OutputFormat | 'auto';
  onChange: (next: {
    width: string;
    height: string;
    fit: ResizeFit;
    format: OutputFormat | 'auto';
  }) => void;
}

const FIT_OPTIONS: { value: ResizeFit; label: string; hint: string }[] = [
  { value: 'cover', label: 'Cover', hint: 'Crop to fill (default)' },
  { value: 'contain', label: 'Contain', hint: 'Fit inside, add padding' },
  { value: 'fill', label: 'Fill', hint: 'Stretch to dimensions' },
  { value: 'inside', label: 'Inside', hint: 'Scale within bounds' },
  { value: 'outside', label: 'Outside', hint: 'Scale to exceed bounds' },
];

const FORMAT_OPTIONS = [
  { value: 'auto', label: 'Keep original format' },
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
] as const;

const intRegex = /^[0-9]*$/;

export function ResizePanel({
  width,
  height,
  fit,
  format,
  onChange,
}: ResizePanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="resize-width"
            className="text-xs font-medium text-muted-foreground text-left"
          >
            Width (px)
          </label>
          <Input
            id="resize-width"
            inputMode="numeric"
            placeholder="e.g. 1024"
            value={width}
            onChange={(e) => {
              const v = e.target.value;
              if (intRegex.test(v)) onChange({ width: v, height, fit, format });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="resize-height"
            className="text-xs font-medium text-muted-foreground text-left"
          >
            Height (px)
          </label>
          <Input
            id="resize-height"
            inputMode="numeric"
            placeholder="e.g. 1024"
            value={height}
            onChange={(e) => {
              const v = e.target.value;
              if (intRegex.test(v)) onChange({ width, height: v, fit, format });
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground text-left">Fit mode</label>
        <Select
          value={fit}
          onValueChange={(v) =>
            onChange({ width, height, fit: v as ResizeFit, format })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="font-medium text-left">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.hint}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground text-left">
          Output format
        </label>
        <Select
          value={format}
          onValueChange={(v) =>
            onChange({
              width,
              height,
              fit,
              format: v as OutputFormat | 'auto',
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Provide width, height, or both. Empty fields keep the original dimension on that axis.
      </p>
    </div>
  );
}
