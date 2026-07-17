import * as cuivienen from './cuivienen.js';
import VanishingQuest from '../quests/vanishing.js';
import * as steppes from './steppes.js';
import StragglersQuest from '../quests/stragglers.js';
import * as greatforest from './greatforest.js';
import LostBeforeNightfallQuest from '../quests/lostbeforenightfall.js';
import * as valesanduin from './valesanduin.js';
import LenwesChoiceQuest from '../quests/lenweschoice.js';
import * as hithaeglir from './hithaeglir.js';
import ThePassQuest from '../quests/thepass.js';
import * as rhovanion from './rhovanion.js';
import TheLongRoadQuest from '../quests/thelongroad.js';
import * as eredluin from './eredluin.js';
import FirstContactQuest from '../quests/firstcontact.js';
import * as training from './training.js';
import TrainingQuest from '../quests/training.js';

// One entry per playable waypoint zone. WorldScene looks a zone up by
// state.zone to build the map and instantiate its quest — this is the only
// place that needs to change when a new waypoint ships.
export const ZONES = {
  cuivienen: { build: cuivienen.build, Quest: VanishingQuest, questId: 'vanishing' },
  steppes: { build: steppes.build, Quest: StragglersQuest, questId: 'stragglers' },
  'great-forest': { build: greatforest.build, Quest: LostBeforeNightfallQuest, questId: 'lost-before-nightfall' },
  'vales-anduin': { build: valesanduin.build, Quest: LenwesChoiceQuest, questId: 'lenwes-choice' },
  hithaeglir: { build: hithaeglir.build, Quest: ThePassQuest, questId: 'the-pass' },
  rhovanion: { build: rhovanion.build, Quest: TheLongRoadQuest, questId: 'the-long-road' },
  'ered-luin': { build: eredluin.build, Quest: FirstContactQuest, questId: 'first-contact' },
  training: { build: training.build, Quest: TrainingQuest, questId: 'training' }, // class-trial grounds, never saved
};

// A fresh quest-progress object for first entry into a zone (concept doc
// §13.0 — each waypoint's quest is self-contained). JourneyScene uses this
// when the character's current quest doesn't belong to the zone they're
// entering, i.e. this is genuinely their first visit.
export function freshQuestState(zoneId) {
  return { id: ZONES[zoneId].questId, stage: 0, flags: {} };
}
