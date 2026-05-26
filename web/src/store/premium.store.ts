import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PremiumState {
  /**
   * When true, ads are hidden across the app and the AdSense script will not
   * be requested for this user. Wire this to your auth/billing source in
   * production (e.g. via an effect that calls `setPremium(user.plan === 'pro')`).
   */
  isPremium: boolean;
  setPremium: (value: boolean) => void;
}

/**
 * Tiny persisted store so a premium status survives reloads without forcing
 * the app into an auth-aware shell. Replace `localStorage` with secure cookie
 * lookup once the backend exposes a session.
 */
export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      isPremium: false,
      setPremium: (value) => set({ isPremium: value }),
    }),
    {
      name: 'vidgrab-premium',
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
