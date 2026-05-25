import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';

export function validateConfig<T extends object>(
  config: Record<string, unknown>,
  envClass: ClassConstructor<T>,
): T {
  const validated = plainToInstance(envClass, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validated;
}
