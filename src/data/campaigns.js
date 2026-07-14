// Campaigns available inside a profile — each is its own separate,
// replayable scenario (concept doc §3, §10). Only "The Great Journey" is
// playable in this build; later campaigns are listed so the unlock chain is
// visible, but stay locked until their predecessor is completed.

export const CAMPAIGNS = [
  {
    id: 'greatJourney',
    name: 'The Great Journey',
    era: 'Before the Sun and Moon',
    blurb: 'The Elves awaken at Cuiviénen and march west, kindred by kindred, toward the light of Aman.',
    built: true,
  },
  {
    id: 'silmarilsExile',
    name: 'The Silmarils & the Exile of the Noldor',
    era: 'The Elder Days',
    blurb: 'The Two Trees are darkened, the Silmarils are stolen, and the Noldor turn back toward Middle-earth.',
    built: false,
  },
  {
    id: 'firstAge',
    name: 'First Age — Beleriand',
    era: 'The First Age',
    blurb: 'The wars of Beleriand, fought from hidden cities against the growing might of Angband.',
    built: false,
  },
];

export function campaignById(id) {
  return CAMPAIGNS.find((c) => c.id === id);
}

export function isCampaignUnlocked(profile, index) {
  if (index === 0) return true;
  const prev = CAMPAIGNS[index - 1];
  return !!profile?.campaigns?.[prev.id]?.completed;
}
