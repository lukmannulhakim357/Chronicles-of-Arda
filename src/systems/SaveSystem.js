import { SAVE_KEY } from '../config.js';

// Free save anywhere + autosave on zone entry (concept doc §3, §15.3).
// One slot for the prototype; the multi-slot profile system comes later.

export const SaveSystem = {
  has() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  save(state, meta = {}) {
    try {
      const payload = { ...state, savedAt: Date.now(), saveMeta: meta };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  },
};
