import { z } from 'zod';
import { ALLOWED_PROVIDERS } from '@/constants';

const providerPatterns = ALLOWED_PROVIDERS.map((p) => p.pattern);

export const urlFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .url('Enter a valid URL')
    .refine(
      (value) => providerPatterns.some((pattern) => pattern.test(value)),
      'Unsupported provider. Use YouTube, Facebook, Instagram, TikTok, or Vimeo.',
    ),
});

export type UrlFormValues = z.infer<typeof urlFormSchema>;
