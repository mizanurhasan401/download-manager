/**
 * AdSense configuration.
 *
 * `client` is the only required env var. Slot IDs are optional during local
 * development — when a slot is missing the ad components render a labeled
 * placeholder instead of trying (and failing) to fetch a real ad.
 *
 * Add new slots here in one place rather than scattering IDs across components.
 * Keep the slot registry typed so consumers cannot reference an unknown slot.
 */
export const adsConfig = {
  client: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? '',
  slots: {
    homeTop: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP ?? '',
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR ?? '',
    inline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE ?? '',
    inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE ?? '',
    result: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT ?? '',
  },
  /** Skip ad init entirely when the env var is missing (e.g. during builds). */
  get enabled(): boolean {
    return Boolean(this.client);
  },
  /**
   * AdSense recommends loading the script with `async` + `crossorigin="anonymous"`.
   * Source URL takes the publisher ID via a query param.
   */
  get scriptSrc(): string {
    if (!this.client) return '';
    return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.client}`;
  },
} as const;

export type AdSlotKey = keyof typeof adsConfig.slots;
