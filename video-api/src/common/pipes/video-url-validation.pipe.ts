import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { sanitizeUrl } from '../utils';
import { ProviderNotAllowedException } from '../exceptions/business.exception';
import { VideoProviderEnum } from '../enums';
import { detectProvider } from '../providers';

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

    const provider = detectProvider(sanitized);
    if (!provider) {
      throw new ProviderNotAllowedException(
        `URL "${sanitized}" does not match any supported provider`,
      );
    }

    return sanitized;
  }
}

export function resolveProviderFromUrl(url: string): VideoProviderEnum {
  return detectProvider(url)?.id ?? VideoProviderEnum.OTHER;
}
