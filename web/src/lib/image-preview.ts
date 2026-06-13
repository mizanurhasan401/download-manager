function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

async function heicPreviewUrl(file: File): Promise<string> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.85,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return URL.createObjectURL(blob);
}

export async function createImagePreviewUrl(file: File): Promise<string> {
  if (isHeicFile(file)) {
    return heicPreviewUrl(file);
  }
  return URL.createObjectURL(file);
}
