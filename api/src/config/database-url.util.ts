export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_SCHEMA,
  } = env;

  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_HOST || !POSTGRES_DB) {
    throw new Error(
      'DATABASE_URL is missing. Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, and POSTGRES_DB in .env.development',
    );
  }

  const port = POSTGRES_PORT ?? '5432';
  const schema = POSTGRES_SCHEMA ?? 'public';

  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${port}/${POSTGRES_DB}?schema=${schema}`;
}

export function resolveAppBaseUrl(
  host: string,
  port: number,
  protocol = 'http',
): string {
  return `${protocol}://${host}:${port}`;
}
