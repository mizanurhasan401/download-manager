import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { ALLOWED_PROVIDERS } from '../constants';
import { extractHostname, sanitizeUrl } from '../utils';
import { ProviderNotAllowedException } from '../exceptions/business.exception';
import { VideoProviderEnum } from '../enums';

@Injectable()
export class VideoUrlValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('URL is required');
    }

    let sanitized: string;
    try {
      sanitized = sanitizeUrl(value);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    const hostname = extractHostname(sanitized);
    const isAllowed = ALLOWED_PROVIDERS.some(
      (provider) => hostname === provider || hostname.endsWith(`.${provider}`),
    );

    if (!isAllowed) {
      throw new ProviderNotAllowedException(
        `Provider "${hostname}" is not in the allowed list`,
      );
    }

    return sanitized;
  }
}

export function resolveProviderFromUrl(url: string): VideoProviderEnum {
  const hostname = extractHostname(url);

  if (hostname.includes('youtube') || hostname.includes('youtu.be')) {
    return VideoProviderEnum.YOUTUBE;
  }
  if (hostname.includes('facebook') || hostname.includes('fb.watch')) {
    return VideoProviderEnum.FACEBOOK;
  }
  if (hostname.includes('instagram')) {
    return VideoProviderEnum.INSTAGRAM;
  }
  if (hostname.includes('tiktok')) {
    return VideoProviderEnum.TIKTOK;
  }
  if (hostname.includes('vimeo')) {
    return VideoProviderEnum.VIMEO;
  }

  return VideoProviderEnum.OTHER;
}
