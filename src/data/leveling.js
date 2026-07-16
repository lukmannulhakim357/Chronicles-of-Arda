import { spentSkillPoints, MAX_TREE_POINTS } from './skills.js';

// Leveling & EXP (concept doc §16.6). Every level grants 3 stat points and
// 1 skill point spent in the class's skill tree (skills.js). Once a class's
// 38-point tree is fully maxed, further skill-point grants auto-convert to
// bonus stat points instead (skill doc §1) — nothing wasted late-game.

export function xpToNextLevel(level) {
  return Math.round((50 * Math.pow(level, 1.5)) / 10) * 10;
}

// Applies XP, rolling over as many level-ups as the amount covers.
// Returns the number of levels gained (0 if the grant didn't cross a level).
export function grantXp(state, amount) {
  state.xp = (state.xp ?? 0) + amount;
  let gained = 0;
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    state.statPoints = (state.statPoints ?? 0) + 3;
    const banked = state.skillPoints ?? 0;
    const spent = spentSkillPoints(state, state.classId);
    if (spent + banked >= MAX_TREE_POINTS) {
      state.statPoints += 1; // tree already maxed — convert instead of banking
    } else {
      state.skillPoints = banked + 1;
    }
    gained += 1;
  }
  return gained;
}

// Gold — rewarded on quest/waypoint/campaign completion and, in smaller
// amounts, from things like defeating a foe or opening a treasure find.
export function grantGold(state, amount) {
  state.gold = (state.gold ?? 0) + amount;
  return state.gold;
}
