'use client';

import Script from 'next/script';
import { adsConfig } from '@/config/ads';
import { usePremiumStore } from '@/store/premium.store';

/**
 * Centralised AdSense script loader.
 *
 * Mounted exactly once in `RootLayout`. Uses `next/script` with
 * `afterInteractive` so it never blocks first paint, and the unique `id`
 * prevents the script tag from being injected twice on client navigations.
 *
 * The script is skipped entirely when:
 *  - the publisher env var is missing (e.g. CI builds), or
 *  - the current user is premium.
 *
 * Note: this component must stay slim — no JSX besides `<Script>` — so it can
 * sit safely inside server-rendered layouts as a client island.
 */
export function AdSenseProvider() {
  const isPremium = usePremiumStore((state) => state.isPremium);

  if (!adsConfig.enabled || isPremium) return null;

  return (
    <Script
      id="adsbygoogle-init"
      src={adsConfig.scriptSrc}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      // AdSense throws if loaded twice. The stable `id` ensures Next does not
      // duplicate the tag on client-side navigation or fast refresh.
    />
  );
}
