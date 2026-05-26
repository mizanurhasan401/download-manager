import { z } from 'zod';

export const TARGET_FORMAT_VALUES = [
  'PDF',
  'DOCX',
  'PNG',
  'JPG',
  'WEBP',
] as const;

export const conversionSchema = z.object({
  targetFormat: z.enum(TARGET_FORMAT_VALUES),
  quality: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
});

export type ConversionFormValues = z.infer<typeof conversionSchema>;
