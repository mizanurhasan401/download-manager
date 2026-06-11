export const siteConfig = {
  name: 'VidGrab',
  tagline: 'Free Online Video Downloader',
  title:
    'VidGrab — Free Online Video Downloader | YouTube, TikTok, Instagram & More',
  description:
    'Download videos and audio from YouTube, TikTok, Instagram, Facebook, Vimeo, and X for free. Convert images, resize photos, remove backgrounds, and convert PDF & document files online.',
  keywords: [
    'video downloader',
    'youtube downloader',
    'tiktok downloader',
    'instagram video download',
    'facebook video downloader',
    'free mp4 download',
    'mp3 converter',
    'online video downloader',
    'image converter',
    'pdf converter',
    'file converter',
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001',
  pages: {
    home: {
      title:
        'VidGrab — Free Online Video Downloader | YouTube, TikTok, Instagram & More',
      description:
        'Paste a YouTube, TikTok, Instagram, Facebook, Vimeo, or X link and download videos in MP4 or MP3. Fast, free, and no signup required.',
    },
    images: {
      title: 'Free Image Tools Online — Resize, Convert & Remove Background',
      description:
        'Convert, resize, and remove backgrounds from images online. Supports PNG, JPG, WebP, and AVIF with fast processing.',
    },
    fileConverter: {
      title: 'Free File Converter Online — PDF, DOCX, PPTX & Image Conversion',
      description:
        'Convert PDF, DOCX, PPTX, XLSX, and image files online. Free document and image format converter powered by VidGrab.',
    },
    history: {
      title: 'Download History',
      description:
        'View your recent video downloads stored locally in your browser.',
    },
    health: {
      title: 'System Health & API Status',
      description:
        'Check VidGrab API, database, Redis, and storage service health status.',
    },
  },
} as const;

export const APP_NAME = siteConfig.name;

export function pageTitle(pageTitle: string): string {
  return `${pageTitle} | ${siteConfig.name}`;
}
