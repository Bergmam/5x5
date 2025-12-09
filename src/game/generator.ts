import { createRng } from './rng';
import { makePath } from './path';
import {
  GenerationConfig,
  MapFloor,
  Tile,
  TileKind,
  Vec2,
  EntityBase
} from './types';
import { validateFloor } from './validate';

function indexFromPos(pos: Vec2, width: number) {
  return pos.y * width + pos.x;
}

const defaultConfig: GenerationConfig = {
  width: 5,
  height: 5,
  wallDensity: 0.12,
  enemyBudget: 3,
  chestBudget: 1,
  minPathLength: 3
};

export function generateFloor(seed: string | number, cfg?: Partial<GenerationConfig>): MapFloor {
  const config: GenerationConfig = { ...defaultConfig, ...(cfg || {}) } as GenerationConfig;
  const rng = createRng(seed);

  const entrance: Vec2 = config.entrance ?? { x: 0, y: Math.floor(config.height / 2) };
  const exit: Vec2 = config.exit ?? { x: config.width - 1, y: Math.floor(config.height / 2) };

  const path = makePath(entrance, exit, config.width, config.height, rng, config.minPathLength);
  const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));

  // init tiles as floor
  const tiles: Tile[] = [];
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      const kind: TileKind = pathSet.has(`${x},${y}`)
        ? 'floor'
        : 'floor';
      tiles.push({ pos: { x, y }, kind, walkable: true });
    }
  }

  // mark entrance/exit tiles
  tiles[indexFromPos(entrance, config.width)].kind = 'entrance';
  tiles[indexFromPos(exit, config.width)].kind = 'exit';

  // place walls off-path with some probability
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const key = `${t.pos.x},${t.pos.y}`;
    if (key === `${entrance.x},${entrance.y}` || key === `${exit.x},${exit.y}`) continue;
    if (pathSet.has(key)) continue;
    if (rng() < config.wallDensity) {
      t.kind = 'wall';
      t.walkable = false;
    }
  }

  // place chests near path
  const entities: EntityBase[] = [];
  const candidateTiles = tiles.filter((t) => t.walkable && !pathSet.has(`${t.pos.x},${t.pos.y}`));

  // place chests
  for (let c = 0; c < config.chestBudget; c++) {
    if (candidateTiles.length === 0) break;
    const t = candidateTiles[Math.floor(rng() * candidateTiles.length)];
    entities.push({ id: `chest-${c}`, kind: 'item', pos: t.pos, data: { chest: true } });
  }

  // place enemies with minimum distance from entrance
  function manhattan(a: Vec2, b: Vec2) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  const enemyCandidates = tiles.filter((t) => t.walkable && manhattan(t.pos, entrance) >= 2 && t.kind !== 'entrance' && t.kind !== 'exit');
  for (let e = 0; e < config.enemyBudget; e++) {
    if (enemyCandidates.length === 0) break;
    const pick = enemyCandidates[Math.floor(rng() * enemyCandidates.length)];
    // avoid placing two entities on same tile
    if (entities.find((x) => x.pos.x === pick.pos.x && x.pos.y === pick.pos.y)) continue;
    entities.push({ id: `enemy-${e}`, kind: 'enemy', pos: pick.pos, data: { level: 1 } });
  }

  const floor: MapFloor = {
    width: config.width,
    height: config.height,
    seed: String(seed),
    tiles,
    entities,
    entrance,
    exit,
    generatedAt: new Date().toISOString(),
    version: '0.1.0'
  };

  const validation = validateFloor(floor);
  if (!validation.solvable) {
    // fallback: clear all walls to guarantee solvability
    for (const t of floor.tiles) {
      t.kind = t.kind === 'entrance' ? 'entrance' : t.kind === 'exit' ? 'exit' : 'floor';
      t.walkable = true;
    }
  }

  return floor;
}
