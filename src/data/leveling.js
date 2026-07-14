// Leveling & EXP (concept doc §16.6). Every level grants 3 stat points and
// 1 skill point — skill points are banked for the class skill tree, which
// doesn't exist yet, so there's no spend UI for them until a class ability
// system ships.

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
    state.skillPoints = (state.skillPoints ?? 0) + 1;
    gained += 1;
  }
  return gained;
}
