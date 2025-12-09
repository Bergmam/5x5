import { Vec2, MapFloor, EntityBase, Tile } from './types';

// Direction constants for 4-directional movement
export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
} as const;

export type Direction = typeof DIRECTIONS[keyof typeof DIRECTIONS];

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  weaponDamage: number;
  spellDamage: number;
  armor: number;
  inventory: EntityBase[];
}

export interface MoveResult {
  success: boolean;
  reason?: string;
  newPos?: Vec2;
  pickedUpItem?: EntityBase;
  triggeredTrap?: boolean;
  triggeredExit?: boolean;
  attackedEnemy?: EntityBase;
}

function indexFromPos(pos: Vec2, width: number): number {
  return pos.y * width + pos.x;
}

export function getTile(floor: MapFloor, pos: Vec2): Tile | null {
  if (!isInBounds(pos, floor)) return null;
  return floor.tiles[indexFromPos(pos, floor.width)];
}

export function isInBounds(pos: Vec2, floor: MapFloor): boolean {
  return pos.x >= 0 && pos.x < floor.width && pos.y >= 0 && pos.y < floor.height;
}

export function getEntityAt(floor: MapFloor, pos: Vec2): EntityBase | null {
  return floor.entities.find((e) => e.pos.x === pos.x && e.pos.y === pos.y) || null;
}

export function getAdjacentTiles(pos: Vec2, floor: MapFloor): Vec2[] {
  return [
    DIRECTIONS.UP,
    DIRECTIONS.DOWN,
    DIRECTIONS.LEFT,
    DIRECTIONS.RIGHT,
  ]
    .map((dir) => ({ x: pos.x + dir.x, y: pos.y + dir.y }))
    .filter((p) => isInBounds(p, floor));
}

export function isValidMove(pos: Vec2, targetPos: Vec2, floor: MapFloor): boolean {
  // Check if target is adjacent (Manhattan distance = 1)
  const dx = Math.abs(targetPos.x - pos.x);
  const dy = Math.abs(targetPos.y - pos.y);
  if (dx + dy !== 1) return false;

  // Check bounds
  if (!isInBounds(targetPos, floor)) return false;

  // Check walkability
  const tile = getTile(floor, targetPos);
  return tile ? tile.walkable : false;
}

export function attemptMove(
  player: Player,
  direction: Direction,
  floor: MapFloor
): MoveResult {
  const targetPos: Vec2 = {
    x: player.pos.x + direction.x,
    y: player.pos.y + direction.y,
  };

  // 1. Bounds check
  if (!isInBounds(targetPos, floor)) {
    return { success: false, reason: 'out-of-bounds' };
  }

  // 2. Get target tile
  const targetTile = getTile(floor, targetPos);
  if (!targetTile) {
    return { success: false, reason: 'invalid-tile' };
  }

  // 3. Walkability check
  if (!targetTile.walkable) {
    return { success: false, reason: 'blocked' };
  }

  // 4. Entity collision
  const entityAtTarget = getEntityAt(floor, targetPos);

  if (entityAtTarget?.kind === 'enemy') {
    // Don't move; trigger melee attack (combat system will handle this)
    return {
      success: false,
      reason: 'enemy-collision',
      attackedEnemy: entityAtTarget,
    };
  }

  let pickedUpItem: EntityBase | undefined;
  if (entityAtTarget?.kind === 'item') {
    // Pick up item if inventory has space (25 slots)
    if (player.inventory.length < 25) {
      pickedUpItem = entityAtTarget;
      // Remove from floor entities
      const idx = floor.entities.indexOf(entityAtTarget);
      if (idx !== -1) {
        floor.entities.splice(idx, 1);
      }
      player.inventory.push(entityAtTarget);
    }
  }

  // 5. Execute movement
  player.pos = targetPos;

  // 6. Handle special tiles
  let triggeredTrap = false;
  let triggeredExit = false;

  if (targetTile.kind === 'trap') {
    triggeredTrap = true;
    // Trap damage/effect will be handled by game system
  }

  if (targetTile.kind === 'exit') {
    triggeredExit = true;
    // Floor completion will be handled by game system
  }

  return {
    success: true,
    newPos: targetPos,
    pickedUpItem,
    triggeredTrap,
    triggeredExit,
  };
}
