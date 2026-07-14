// The three playable kindreds of the Great Journey.
// (Avari, Nandor, Sindar, Falathrim are NPC/narrative-only — see concept doc §4.1.)

export const KINDREDS = [
  {
    id: 'vanyar',
    name: 'Vanyar',
    leader: 'Ingwë',
    epithet: 'The Fair Elves',
    homeCity: 'Valmar, on the slopes of Taniquetil',
    sheet: 'player_vanyar',
    blurb:
      'Followers of Ingwë, first of the three hosts. Golden-haired, closest to the Valar, most eager for the light of the West.',
  },
  {
    id: 'noldor',
    name: 'Noldor',
    leader: 'Finwë',
    epithet: 'The Deep Elves',
    homeCity: 'Tirion, upon the hill of Túna',
    sheet: 'player_noldor',
    blurb:
      'Followers of Finwë. Dark-haired, restless of mind and skilled of hand — lovers of knowledge, makers of things.',
  },
  {
    id: 'teleri',
    name: 'Teleri',
    leader: 'Elwë & Olwë',
    epithet: 'The Last Comers',
    homeCity: 'Alqualondë, the Haven of Swans',
    sheet: 'player_teleri',
    blurb:
      'The greatest host, led by the brothers Elwë and Olwë. Silver-haired singers, slow to march, drawn to water and to song.',
  },
];

export function kindredById(id) {
  return KINDREDS.find((k) => k.id === id);
}
