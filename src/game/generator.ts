import { createRng } from './rng';
import { makePath } from './path';
import {
  GenerationConfig,
  MapFloor,
  Tile,
  TileKind,
  Vec2,
  EntityBase,
  EnemyData
} from './types';
import { validateFloor } from './validate';
import { getRandomItem } from '../data/itemLoader';

function indexFromPos(pos: Vec2, width: number) {
  return pos.y * width + pos.x;
}

const defaultConfig: GenerationConfig = {
  width: 5,
  height: 5,
  wallDensity: 0.5,
  enemyBudget: 3,
  chestBudget: 1,
  minPathLength: 3
};

export function generateFloor(seed: string | number, cfg?: Partial<GenerationConfig>): MapFloor {
  const config: GenerationConfig = { ...defaultConfig, ...(cfg || {}) } as GenerationConfig;
  const rng = createRng(seed);

  const entrance: Vec2 = config.entrance ?? { x: 0, y: Math.floor(config.height / 2) };
  
  // Smart exit placement if not provided
  let exit: Vec2;
  if (config.exit) {
    exit = config.exit;
  } else {
    // Completely random exit, but not entrance
    const candidates: Vec2[] = [];
    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        if (x === entrance.x && y === entrance.y) continue;
        candidates.push({ x, y });
      }
    }
    exit = candidates[Math.floor(rng() * candidates.length)];
  }

  const path = makePath(entrance, exit, config.width, config.height, rng, config.minPathLength);
  const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));

  // init tiles as walls
  const tiles: Tile[] = [];
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      // Path tiles are floor, others start as wall
      const isPath = pathSet.has(`${x},${y}`);
      const kind: TileKind = isPath ? 'floor' : 'wall';
      tiles.push({ pos: { x, y }, kind, walkable: isPath });
    }
  }

  // mark entrance/exit tiles
  tiles[indexFromPos(entrance, config.width)].kind = 'entrance';
  tiles[indexFromPos(exit, config.width)].kind = 'exit';
  tiles[indexFromPos(entrance, config.width)].walkable = true;
  tiles[indexFromPos(exit, config.width)].walkable = true;

  // Carve rooms/random floors
  // Iterate non-path tiles and randomly turn them into floors
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const key = `${t.pos.x},${t.pos.y}`;
    
    // Skip path, entrance, exit (already handled/protected)
    if (pathSet.has(key)) continue;
    if (key === `${entrance.x},${entrance.y}` || key === `${exit.x},${exit.y}`) continue;

    // wallDensity is now "probability of staying a wall"
    // So if rng() > wallDensity, it becomes floor
    if (rng() > config.wallDensity) {
      t.kind = 'floor';
      t.walkable = true;
    }
  }

  // place chests near path
  const entities: EntityBase[] = [];
  const candidateTiles = tiles.filter((t) => t.walkable && !pathSet.has(`${t.pos.x},${t.pos.y}`));

  // place items (formerly chests) - use items from JSON
  for (let c = 0; c < config.chestBudget; c++) {
    if (candidateTiles.length === 0) break;
    const t = candidateTiles[Math.floor(rng() * candidateTiles.length)];
    const randomItem = getRandomItem(rng);
    entities.push({ 
      id: `item-${c}`, 
      kind: 'item', 
      pos: t.pos, 
      data: { itemId: randomItem.id } 
    });
  }

  // place enemies with minimum distance from entrance
  function manhattan(a: Vec2, b: Vec2) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  const enemyCandidates = tiles.filter((t) => t.walkable && manhattan(t.pos, entrance) >= 2 && t.kind !== 'entrance' && t.kind !== 'exit');
  const floorNumber = config.floorNumber || 1;

  for (let e = 0; e < config.enemyBudget; e++) {
    if (enemyCandidates.length === 0) break;
    const pick = enemyCandidates[Math.floor(rng() * enemyCandidates.length)];
    // avoid placing two entities on same tile
    if (entities.find((x) => x.pos.x === pick.pos.x && x.pos.y === pick.pos.y)) continue;
    
    const enemyData: EnemyData = {
      hp: 5 * floorNumber,
      maxHp: 5 * floorNumber,
      damage: 5 * floorNumber,
      armor: 0, // Armor could scale later
      xpValue: 5 * floorNumber,
      level: floorNumber,
      ai: 'patrol',
      spawnPos: { ...pick.pos },
      state: { mode: 'patrol', patrolIndex: 0, lastHp: 5 * floorNumber }
    };

    entities.push({ 
      id: `enemy-${e}`, 
      kind: 'enemy', 
      pos: pick.pos, 
      data: enemyData 
    });
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
