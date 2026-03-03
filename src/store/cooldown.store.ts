'use client';

import { create } from 'zustand';

const COOLDOWN_MS = Number(
  process.env.NEXT_PUBLIC_OTP_COOLDOWN_MS ?? 120000
);

type CooldownState = {
  remaining: number;
  isActive: boolean;
  intervalId: NodeJS.Timeout | null;

  start: () => void;
  tick: () => void;
  stop: () => void;
};

export const useCooldownStore = create<CooldownState>((set, get) => ({
  remaining: 0,
  isActive: false,
  intervalId: null,

  start: () => {
    if (get().isActive) return;

    set({ remaining: COOLDOWN_MS, isActive: true });

    const id = setInterval(() => {
      get().tick();
    }, 1000);

    set({ intervalId: id });
  },

  tick: () => {
    const remaining = get().remaining - 1000;

    if (remaining <= 0) {
      get().stop();
    } else {
      set({ remaining });
    }
  },

  stop: () => {
    const id = get().intervalId;
    if (id) clearInterval(id);

    set({
      remaining: 0,
      isActive: false,
      intervalId: null,
    });
  },
}));