// The frontend talks to a single API gateway. Nginx (prod) and Next.js
// rewrites (dev) route the sub-paths to each backend service, so the app only
// needs to know one base URL.
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const env = {
  apiUrl: `${apiBase}/videos`,
  imageApiUrl: `${apiBase}/images`,
  fileConverterApiUrl: `${apiBase}/convert`,
} as const;
