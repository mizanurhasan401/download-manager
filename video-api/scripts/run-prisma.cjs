const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_SCHEMA,
  } = process.env;

  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_HOST || !POSTGRES_DB) {
    throw new Error(
      'Set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, and POSTGRES_DB in .env.development',
    );
  }

  const port = POSTGRES_PORT || '5432';
  const schema = POSTGRES_SCHEMA || 'public';

  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${port}/${POSTGRES_DB}?schema=${schema}`;
}

const projectRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(projectRoot, '.env.development'));
loadEnvFile(path.join(projectRoot, '.env'));

const args = process.argv.slice(2);
const command = args[0];

if (command === 'generate') {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public';
} else {
  process.env.DATABASE_URL = resolveDatabaseUrl();
}

const result = spawnSync('pnpm', ['exec', 'prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd: projectRoot,
});

process.exit(result.status ?? 1);
