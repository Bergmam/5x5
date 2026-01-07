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
import { FLOOR_TEMPLATES, shouldSpawnTemplate, templateToFloor } from './templates';

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
  const floorId = String(seed);
  const floorNumber = config.floorNumber || 1;

  // Check if we should use a template instead (only if explicitly enabled)
  if (config.useTemplate === true) {
    for (const template of Object.values(FLOOR_TEMPLATES)) {
      if (shouldSpawnTemplate(template, floorNumber, rng())) {
        return templateToFloor(template, floorId, floorNumber);
      }
    }
  }

  // Continue with normal procedural generation
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
  const occupied = new Set<string>([`${entrance.x},${entrance.y}`, `${exit.x},${exit.y}`]);
  const candidateTiles = tiles.filter((t) => t.walkable && !pathSet.has(`${t.pos.x},${t.pos.y}`) && !occupied.has(`${t.pos.x},${t.pos.y}`));

  // place items (formerly chests) - use items from JSON
  for (let c = 0; c < config.chestBudget; c++) {
    if (candidateTiles.length === 0) break;
    const idx = Math.floor(rng() * candidateTiles.length);
    const t = candidateTiles[idx];
    const key = `${t.pos.x},${t.pos.y}`;
    // Remove from candidate pool so items can't stack on the same location.
    candidateTiles.splice(idx, 1);
    if (occupied.has(key)) {
      c--;
      continue;
    }
    const randomItem = getRandomItem(rng);
    entities.push({ 
      id: `item-${floorId}-${c}`, 
      kind: 'item', 
      pos: t.pos, 
      data: { itemId: randomItem.id } 
    });
    occupied.add(key);
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
  if (occupied.has(`${pick.pos.x},${pick.pos.y}`)) continue;
    
    // Calculate enemy stats based on floor number and enemy index
    // We distribute difficulty: early enemies in a floor are weaker, later ones stronger
    // This creates variety within each floor
    const difficultyVariation = (e / Math.max(1, config.enemyBudget - 1)); // 0 to 1
    const floorDifficulty = floorNumber;
    const enemyLevel = Math.max(1, Math.floor(floorDifficulty * (0.7 + 0.6 * difficultyVariation)));
    
    // Stats scale with enemy level
    const baseHp = 5 + (2 * enemyLevel);
    const baseDamage = 5 + Math.floor(enemyLevel / 2);
    
    const enemyData: EnemyData = {
      hp: baseHp,
      maxHp: baseHp,
      damage: baseDamage,
      armor: 0, // Armor could scale later
      xpValue: 5 * enemyLevel,
      level: enemyLevel,
      ai: 'patrol',
      spawnPos: { ...pick.pos },
      state: { mode: 'patrol', patrolIndex: 0, lastHp: baseHp }
    };

    entities.push({ 
      id: `enemy-${floorId}-${e}`, 
      kind: 'enemy', 
      pos: pick.pos, 
      data: enemyData 
    });
    occupied.add(`${pick.pos.x},${pick.pos.y}`);
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
