'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { OutputFormat } from '@/types/image';

interface ConvertPanelProps {
  format: OutputFormat;
  quality: number;
  onChange: (next: { format: OutputFormat; quality: number }) => void;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; hint: string }[] = [
  { value: 'png', label: 'PNG', hint: 'Lossless, alpha supported' },
  { value: 'jpeg', label: 'JPG', hint: 'Smaller files, no alpha' },
  { value: 'webp', label: 'WebP', hint: 'Best balance' },
  { value: 'avif', label: 'AVIF', hint: 'Smallest, slower encode' },
];

export function ConvertPanel({ format, quality, onChange }: ConvertPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Target format
        </label>
        <Select
          value={format}
          onValueChange={(value) =>
            onChange({ format: value as OutputFormat, quality })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.hint}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {format !== 'png' && (
        <div className="space-y-1.5">
          <label
            htmlFor="convert-quality"
            className="flex items-center justify-between text-xs font-medium text-muted-foreground"
          >
            <span>Quality</span>
            <span className="tabular-nums">{quality}</span>
          </label>
          <Input
            id="convert-quality"
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) =>
              onChange({ format, quality: parseInt(e.target.value, 10) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Lower = smaller file. {format === 'avif' ? '60–75 looks great.' : '75–90 is the sweet spot.'}
          </p>
        </div>
      )}
    </div>
  );
}
