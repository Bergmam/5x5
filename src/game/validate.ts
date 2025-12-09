import { MapFloor, Vec2 } from './types';

function indexFromPos(pos: Vec2, width: number) {
  return pos.y * width + pos.x;
}

export interface ValidationResult {
  solvable: boolean;
  errors: string[];
}

export function validateFloor(floor: MapFloor): ValidationResult {
  const { width, height, entrance, exit, tiles, entities } = floor;
  const q: Vec2[] = [entrance];
  const seen = new Set<string>([`${entrance.x},${entrance.y}`]);
  const isWalkable = (p: Vec2) => {
    if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) return false;
    const t = tiles[indexFromPos(p, width)];
    return !!t && t.walkable;
  };

  const neigh = (p: Vec2) => [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 }
  ];

  let found = false;
  while (q.length) {
    const cur = q.shift() as Vec2;
    if (cur.x === exit.x && cur.y === exit.y) {
      found = true;
      break;
    }
    for (const n of neigh(cur)) {
      const key = `${n.x},${n.y}`;
      if (seen.has(key)) continue;
      if (!isWalkable(n)) continue;
      seen.add(key);
      q.push(n);
    }
  }

  const errors: string[] = [];
  if (!found) errors.push('exit-not-reachable');
  if (entities.length > 0) {
    // simple budget sanity: no two entities share same tile
    const occ = new Set<string>();
    for (const e of entities) {
      const k = `${e.pos.x},${e.pos.y}`;
      if (occ.has(k)) errors.push('entity-overlap:' + k);
      occ.add(k);
    }
  }

  return { solvable: found, errors };
}
