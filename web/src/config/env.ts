export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  imageApiUrl:
    process.env.NEXT_PUBLIC_IMAGE_API_URL ?? 'http://localhost:3100/api/v1',
} as const;
