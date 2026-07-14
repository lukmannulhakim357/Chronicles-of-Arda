// Profile-based save store (concept doc §3, §15.2):
//   profile (account-level name)
//     └── campaigns[campaignId].slots[0..3]  (up to 4 characters per campaign)
//
// Everything lives under one localStorage key as a JSON array of profiles.

const PROFILES_KEY = 'arda.profiles.v1';
export const SLOT_COUNT = 4;

function readAll() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `p${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptySlots() {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

export const SaveSystem = {
  listProfiles() {
    return readAll().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  },

  createProfile(name) {
    const list = readAll();
    const profile = {
      id: makeId(),
      name: name.trim().slice(0, 24) || 'Traveler',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      campaigns: {},
    };
    list.push(profile);
    writeAll(list);
    return profile;
  },

  getProfile(id) {
    return readAll().find((p) => p.id === id) ?? null;
  },

  deleteProfile(id) {
    writeAll(readAll().filter((p) => p.id !== id));
  },

  getCampaignSlots(profileId, campaignId) {
    const p = this.getProfile(profileId);
    return p?.campaigns?.[campaignId]?.slots ?? emptySlots();
  },

  setSlot(profileId, campaignId, slotIndex, characterState) {
    const list = readAll();
    const p = list.find((x) => x.id === profileId);
    if (!p) return;
    if (!p.campaigns[campaignId]) p.campaigns[campaignId] = { slots: emptySlots() };
    p.campaigns[campaignId].slots[slotIndex] = characterState;
    p.updatedAt = Date.now();
    writeAll(list);
  },

  setCampaignCompleted(profileId, campaignId) {
    const list = readAll();
    const p = list.find((x) => x.id === profileId);
    if (!p) return;
    if (!p.campaigns[campaignId]) p.campaigns[campaignId] = { slots: emptySlots() };
    p.campaigns[campaignId].completed = true;
    p.updatedAt = Date.now();
    writeAll(list);
  },

  // Saves into whichever profile/campaign/slot the given scene's registry
  // currently points at (set once when a character is created or resumed).
  saveActive(scene, state, meta = {}) {
    const profileId = scene.registry.get('profileId');
    const campaignId = scene.registry.get('campaignId');
    const slotIndex = scene.registry.get('slotIndex');
    if (profileId == null || campaignId == null || slotIndex == null) return false;
    const lastWhere = meta.where ?? state.lastWhere;
    this.setSlot(profileId, campaignId, slotIndex, { ...state, savedAt: Date.now(), lastWhere });
    return true;
  },
};
