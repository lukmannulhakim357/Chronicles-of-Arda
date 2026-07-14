import { TILE } from '../config.js';

export function tilesToPx(p) {
  return { x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 };
}
