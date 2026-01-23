import type { Direction } from './movement';
import { DIRECTIONS, getEntityAt, getTile, isInBounds } from './movement';
import type { EnemyData, EntityBase, InventoryItem, MapFloor, Vec2 } from './types';
import type { PlayerStats } from './stats';

export type AbilityId = 'fireball' | 'shockwave' | 'teleport';
export type AbilityTargeting = 'instant' | 'directional';

export interface AbilityContext {
  floor: MapFloor;
  playerPos: Vec2;
  facing: Direction | null;
  effectiveStats: PlayerStats;
}

export interface AbilityResult {
  didCast: boolean;
  entities: EntityBase[];
  interaction?: {
    type: 'attack' | 'bump' | 'enemy-aggro' | 'enemy-attack' | 'ability';
    targetPos: { x: number; y: number };
    timestamp: number;
    attackerId?: string;
    aggroEnemyIds?: string[];
    abilityId?: AbilityId;
  } | null;
  hitEnemyIds?: string[];
  damageByEnemyId?: Record<string, number>;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  icon: string;
  mpCost?: number;
  targeting: AbilityTargeting;
  execute: (ctx: AbilityContext) => AbilityResult;
}

function manhattan(a: Vec2, b: Vec2) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function applyDamageToEnemyEntities(
  entities: EntityBase[],
  enemyIds: string[],
  damage: number
): { entities: EntityBase[]; hitEnemyIds: string[] } {
  if (enemyIds.length === 0 || damage <= 0) return { entities, hitEnemyIds: [] };

  const enemyIdSet = new Set(enemyIds);
  const hitEnemyIds: string[] = [];

  const updated = entities
    .map((e) => {
      if (e.kind !== 'enemy') return e;
      if (!enemyIdSet.has(e.id)) return e;

      const data = e.data as EnemyData;
      const newHp = (data.hp || 0) - damage;
      hitEnemyIds.push(e.id);
      return { ...e, data: { ...data, hp: newHp } };
    })
    .filter((e) => {
      if (e.kind !== 'enemy') return true;
      const data = e.data as EnemyData;
      return (data.hp || 0) > 0;
    });

  return { entities: updated, hitEnemyIds };
}

function findFirstEnemyInLine(
  floor: MapFloor,
  start: Vec2,
  dir: Direction
): EntityBase | null {
  let cur: Vec2 = { x: start.x + dir.x, y: start.y + dir.y };

  while (isInBounds(cur, floor)) {
    const tile = getTile(floor, cur);
    if (!tile || !tile.walkable) return null;

    const ent = getEntityAt(floor, cur);
    if (ent?.kind === 'enemy') return ent;

    cur = { x: cur.x + dir.x, y: cur.y + dir.y };
  }

  return null;
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Shoot a fireball straight ahead, hitting the first enemy.',
    icon: '🔥',
    mpCost: 10,
    targeting: 'directional',
    execute: ({ floor, playerPos, facing, effectiveStats }) => {
      if (!facing) {
        return { didCast: false, entities: floor.entities };
      }

      const enemy = findFirstEnemyInLine(floor, playerPos, facing);
      if (!enemy) {
        return {
          didCast: true,
          entities: floor.entities,
          interaction: {
            type: 'ability',
            abilityId: 'fireball',
            targetPos: { ...playerPos },
            timestamp: Date.now(),
          },
          hitEnemyIds: [],
          damageByEnemyId: {},
        };
      }

      const enemyData = enemy.data as EnemyData;
      const damage = Math.max(5, effectiveStats.spellDamage - (enemyData?.armor || 0));

      const { entities, hitEnemyIds } = applyDamageToEnemyEntities(
        floor.entities,
        [enemy.id],
        damage
      );

      return {
        didCast: true,
        entities,
        interaction: {
          type: 'ability',
          abilityId: 'fireball',
          targetPos: { ...enemy.pos },
          timestamp: Date.now(),
        },
        hitEnemyIds,
        damageByEnemyId: { [enemy.id]: damage },
      };
    },
  },

  shockwave: {
    id: 'shockwave',
    name: 'Shockwave',
    description: 'Deal damage to all enemies within 2 tiles.',
    icon: '💥',
    mpCost: 15,
    targeting: 'instant',
    execute: ({ floor, playerPos, effectiveStats }) => {
      const targets = floor.entities
        .filter((e) => e.kind === 'enemy')
        .filter((e) => manhattan(e.pos, playerPos) <= 2);

      const targetIds = targets.map((t) => t.id);

      // For now: scale from spellDamage, and use each enemy's armor.
      // We apply per-enemy armor by doing damage calc per target and applying individually.
      // Since applyDamageToEnemyEntities takes one damage value, do it manually here.
      const hitEnemyIds: string[] = [];
      const damageByEnemyId: Record<string, number> = {};
      const updated = floor.entities
        .map((e) => {
          if (e.kind !== 'enemy') return e;
          if (!targetIds.includes(e.id)) return e;
          const data = e.data as EnemyData;
          const dmg = Math.max(5, effectiveStats.spellDamage - (data?.armor || 0));
          hitEnemyIds.push(e.id);
          damageByEnemyId[e.id] = dmg;
          return { ...e, data: { ...data, hp: (data.hp || 0) - dmg } };
        })
        .filter((e) => {
          if (e.kind !== 'enemy') return true;
          const data = e.data as EnemyData;
          return (data.hp || 0) > 0;
        });

      return {
        didCast: true,
        entities: updated,
        interaction: {
          type: 'ability',
          abilityId: 'shockwave',
          targetPos: { ...playerPos },
          timestamp: Date.now(),
        },
        hitEnemyIds,
        damageByEnemyId,
      };
    },
  },

  teleport: {
    id: 'teleport',
    name: 'Teleport',
    description: 'Teleport to a random walkable tile. Costs 25 MP or HP if insufficient MP.',
    icon: '✨',
    mpCost: 25,
    targeting: 'instant',
    execute: ({ floor, playerPos }) => {
      // Find all walkable tiles without entities
      const walkableTiles: Vec2[] = [];
      for (let y = 0; y < floor.height; y++) {
        for (let x = 0; x < floor.width; x++) {
          const pos = { x, y };
          const tile = getTile(floor, pos);
          const entity = getEntityAt(floor, pos);
          
          // Can teleport to walkable tiles without entities (except current position)
          if (tile?.walkable && !entity && (pos.x !== playerPos.x || pos.y !== playerPos.y)) {
            walkableTiles.push(pos);
          }
        }
      }

      // If no valid tiles, fail to cast
      if (walkableTiles.length === 0) {
        return { didCast: false, entities: floor.entities };
      }

      // Pick a random tile
      const randomIndex = Math.floor(Math.random() * walkableTiles.length);
      const targetPos = walkableTiles[randomIndex];

      return {
        didCast: true,
        entities: floor.entities,
        interaction: {
          type: 'ability',
          abilityId: 'teleport',
          targetPos: { ...targetPos },
          timestamp: Date.now(),
        },
        hitEnemyIds: [],
        damageByEnemyId: {},
      };
    },
  },
};

export function getAbilityById(id: AbilityId): AbilityDef {
  return ABILITIES[id];
}

export function getAbilityBarFromInventory(
  inventory: (InventoryItem | null)[],
  maxSlots = 8
): (AbilityId | null)[] {
  const seen = new Set<string>();
  const abilityIds: AbilityId[] = [];

  for (const item of inventory) {
    if (!item) continue;
    if (item.kind !== 'ability-granting') continue;
    if (!item.abilityId) continue;
    if (seen.has(item.abilityId)) continue;

    // Only include known abilities for now.
    if (item.abilityId === 'fireball' || item.abilityId === 'shockwave' || item.abilityId === 'teleport') {
      seen.add(item.abilityId);
      abilityIds.push(item.abilityId);
    }
  }

  const bar: (AbilityId | null)[] = Array(maxSlots).fill(null);
  for (let i = 0; i < Math.min(maxSlots, abilityIds.length); i++) {
    bar[i] = abilityIds[i];
  }
  return bar;
}

export function isDirectionalAbility(id: AbilityId): boolean {
  return getAbilityById(id).targeting === 'directional';
}

export function normalizeDirection(dir: Direction): Direction {
  // Ensure we always store a stable object reference for equality checks
  if (dir.x === DIRECTIONS.UP.x && dir.y === DIRECTIONS.UP.y) return DIRECTIONS.UP;
  if (dir.x === DIRECTIONS.DOWN.x && dir.y === DIRECTIONS.DOWN.y) return DIRECTIONS.DOWN;
  if (dir.x === DIRECTIONS.LEFT.x && dir.y === DIRECTIONS.LEFT.y) return DIRECTIONS.LEFT;
  return DIRECTIONS.RIGHT;
}
