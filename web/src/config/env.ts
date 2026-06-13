export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
  imageApiUrl: process.env.NEXT_PUBLIC_IMAGE_API_URL ?? '/images/api/v1',
  fileConverterApiUrl:
    process.env.NEXT_PUBLIC_FILE_CONVERTER_API_URL ?? '/convert/api/v1',
} as const;
