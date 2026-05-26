'use client';

import { ArrowRight, FileType } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConversionFileFormat } from '@/types/file-converter';
import {
  ConversionOption,
  getAvailableTargets,
} from '@/features/file-converter/utils/conversion-matrix';
import { CreateConversionBody } from '@/types/file-converter';

interface ConversionFormatSelectorProps {
  sourceFormat: ConversionFileFormat | null;
  targetFormat: CreateConversionBody['targetFormat'] | null;
  onTargetChange: (target: CreateConversionBody['targetFormat']) => void;
  disabled?: boolean;
}

export function ConversionFormatSelector({
  sourceFormat,
  targetFormat,
  onTargetChange,
  disabled = false,
}: ConversionFormatSelectorProps) {
  const options: ConversionOption[] = sourceFormat
    ? getAvailableTargets(sourceFormat)
    : [];

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileType className="h-3.5 w-3.5" />
        Convert to
      </label>

      <div className="flex items-center gap-2">
        <div className="inline-flex h-11 min-w-20 items-center justify-center rounded-xl border border-border/70 bg-muted/30 px-4 text-sm font-medium">
          {sourceFormat ?? '—'}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Select
          value={targetFormat ?? undefined}
          onValueChange={(value) =>
            onTargetChange(value as CreateConversionBody['targetFormat'])
          }
          disabled={disabled || options.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select target format" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={`${option.source}-${option.target}`} value={option.target}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sourceFormat && options.length === 0 && (
        <p className="text-xs text-destructive">
          No conversions available for {sourceFormat}.
        </p>
      )}
    </div>
  );
}
