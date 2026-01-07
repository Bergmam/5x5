import type { MapFloor, Tile, EntityBase, Vec2 } from './types';

export interface FloorTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  // Layout: array of strings where each character represents a tile
  // '.' = floor, '#' = wall, 'E' = entrance, 'X' = exit, 'S' = shopkeeper spawn
  layout: string[];
  spawnChance: number; // 0-1 probability of appearing
  minFloor?: number; // Minimum floor number for this template to appear
  maxFloor?: number; // Maximum floor number for this template to appear
}

export const FLOOR_TEMPLATES: Record<string, FloorTemplate> = {
  shop: {
    id: 'shop',
    name: 'Shop Floor',
    description: 'A safe floor with a merchant',
    width: 5,
    height: 5,
    layout: [
      '#####',
      '#...#',
      'E.S.X',
      '#...#',
      '#####',
    ],
    spawnChance: 0.75, // 75% chance on eligible floors
    minFloor: 5, // First possible shop floor
  },
};

/**
 * Checks if a template should spawn on the given floor number
 */
export function shouldSpawnTemplate(
  template: FloorTemplate,
  floorNumber: number,
  randomValue: number
): boolean {
  // Check floor range
  if (template.minFloor !== undefined && floorNumber < template.minFloor) {
    return false;
  }
  if (template.maxFloor !== undefined && floorNumber > template.maxFloor) {
    return false;
  }
  
  // For shop template, only spawn on multiples of 5
  if (template.id === 'shop' && floorNumber % 5 !== 0) {
    return false;
  }
  
  // Check random chance
  return randomValue < template.spawnChance;
}

/**
 * Converts a template layout into a MapFloor
 */
export function templateToFloor(
  template: FloorTemplate,
  seed: string,
  floorNumber: number
): MapFloor {
  const tiles: Tile[] = [];
  const entities: EntityBase[] = [];
  let entrance: Vec2 | null = null;
  let exit: Vec2 | null = null;

  // Parse the layout
  for (let y = 0; y < template.height; y++) {
    const row = template.layout[y] || '';
    for (let x = 0; x < template.width; x++) {
      const char = row[x] || '#';
      const pos: Vec2 = { x, y };
      
      let kind: Tile['kind'] = 'floor';
      let walkable = true;
      
      switch (char) {
        case '#':
          kind = 'wall';
          walkable = false;
          break;
        case '.':
          kind = 'floor';
          walkable = true;
          break;
        case 'E':
          kind = 'entrance';
          walkable = true;
          entrance = pos;
          break;
        case 'X':
          kind = 'exit';
          walkable = true;
          exit = pos;
          break;
        case 'S':
          // Shopkeeper spawn point
          kind = 'floor';
          walkable = true;
          entities.push({
            id: `shopkeeper-${seed}`,
            kind: 'npc',
            pos: { ...pos },
            data: { npcType: 'shopkeeper' },
          });
          break;
        default:
          kind = 'floor';
          walkable = true;
      }
      
      tiles.push({ pos, kind, walkable });
    }
  }

  // Validate that entrance and exit were found
  if (!entrance) {
    entrance = { x: 0, y: Math.floor(template.height / 2) };
    const idx = entrance.y * template.width + entrance.x;
    tiles[idx].kind = 'entrance';
    tiles[idx].walkable = true;
  }
  
  if (!exit) {
    exit = { x: template.width - 1, y: Math.floor(template.height / 2) };
    const idx = exit.y * template.width + exit.x;
    tiles[idx].kind = 'exit';
    tiles[idx].walkable = true;
  }

  return {
    width: template.width,
    height: template.height,
    seed,
    tiles,
    entities,
    entrance,
    exit,
    generatedAt: new Date().toISOString(),
    version: '0.1.0',
  };
}
