import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM_KEY = 'skipResponseTransform';

export const SkipResponseTransform = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);
