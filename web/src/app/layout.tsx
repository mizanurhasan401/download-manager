import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AdSenseProvider } from '@/components/ads';
import { AppProviders } from '@/components/providers/app-providers';
import { adsConfig } from '@/config/ads';
import { APP_NAME } from '@/constants';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'Download videos from YouTube, TikTok, Instagram, Facebook, and Vimeo.',
  // AdSense site verification meta tag. Skipped when the env var is missing.
  ...(adsConfig.enabled
    ? { other: { 'google-adsense-account': adsConfig.client } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppProviders>
          {children}
          <Toaster richColors position="top-right" />
        </AppProviders>
        <AdSenseProvider />
      </body>
    </html>
  );
}
