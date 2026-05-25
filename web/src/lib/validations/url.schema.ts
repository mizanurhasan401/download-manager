import { z } from 'zod';
import { isSupportedUrl } from '@/lib/providers';

export const urlFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .url('Enter a valid URL')
    .refine(
      isSupportedUrl,
      'Unsupported provider. Use YouTube, Facebook, Instagram, TikTok, Vimeo, or Twitter/X.',
    ),
});

export type UrlFormValues = z.infer<typeof urlFormSchema>;
