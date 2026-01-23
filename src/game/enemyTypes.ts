import type { MapFloor, Vec2, EntityBase, EnemyData } from './types';

// Enemy type identifiers
export type EnemyTypeId = 
  | 'goblin'      // Basic melee, patrol behavior
  | 'archer'      // Ranged attacks, keeps distance
  | 'mage'        // Casts spells on turn intervals
  | 'brute'       // High HP melee, slow movement
  | 'ghost'       // Teleports towards player
  | 'turret';     // Static, ranged attacks

// Movement patterns for enemies
export type MovementPattern = 
  | 'static'              // Never moves
  | 'patrol'              // Wanders near spawn
  | 'chase'               // Pursues player (current "follow")
  | 'maintain-distance'   // Keeps specific distance from player
  | 'teleport';           // Teleports instead of walking

// Attack patterns for enemies
export type AttackPattern = 
  | 'melee'       // Adjacent attacks (current system)
  | 'ranged'      // Attacks from distance
  | 'aoe';        // Area of effect damage

// Context passed to enemy abilities
export interface EnemyAbilityContext {
  floor: MapFloor;
  enemy: EntityBase;
  enemyData: EnemyData;
  playerPos: Vec2;
  turnCount: number;
}

// Result of executing an enemy ability
export interface EnemyAbilityResult {
  // Updated floor entities (enemies/player affected)
  entities?: EntityBase[];
  
  // Damage to player
  playerDamage?: number;
  
  // Visual effect to display
  visualEffect?: {
    type: 'projectile' | 'aoe' | 'buff' | 'teleport';
    from: Vec2;
    to?: Vec2;
    radius?: number;
    icon: string;
  };
  
  // Combat text events
  combatText?: Array<{
    kind: 'damage' | 'heal' | 'buff';
    amount: number;
    pos: Vec2;
  }>;
}

// Enemy ability definition
export interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  turnInterval: number;  // Execute every N turns
  
  // Execution function
  execute: (context: EnemyAbilityContext) => EnemyAbilityResult;
}

// Stats for enemy scaling
export interface EnemyStats {
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  xpValue: number;
}

// Complete enemy type definition
export interface EnemyTypeDefinition {
  id: EnemyTypeId;
  name: string;
  description: string;
  icon: string;
  
  // Base stats (scaled by level/floor)
  baseHp: number;
  baseDamage: number;
  baseArmor: number;
  xpMultiplier: number;
  
  // Behavior
  movementPattern: MovementPattern;
  attackPattern: AttackPattern;
  attackRange: number;      // Tiles away enemy can attack from
  moveSpeed: number;         // 1 = normal, 0.5 = slow (moves every other turn)
  aggroRange: number;        // Distance at which enemy becomes aggressive
  
  // Special properties
  abilities?: EnemyAbility[];
  immunities?: string[];     // e.g., ['fire', 'poison']
  
  // Scaling function (optional custom scaling per type)
  scaleStats?: (baseStats: EnemyStats, level: number) => EnemyStats;
}

// Default stat scaling function
function defaultScaling(base: EnemyStats, level: number): EnemyStats {
  return {
    hp: base.hp + (2 * level),
    maxHp: base.hp + (2 * level),
    damage: base.damage + Math.floor(level / 2),
    armor: base.armor + Math.floor(level / 5),
    xpValue: 5 * level,
  };
}

// Enemy type definitions
const GOBLIN: EnemyTypeDefinition = {
  id: 'goblin',
  name: 'Goblin',
  description: 'Weak melee enemy that patrols its territory',
  icon: '👹',
  
  baseHp: 5,
  baseDamage: 5,
  baseArmor: 0,
  xpMultiplier: 1.0,
  
  movementPattern: 'patrol',
  attackPattern: 'melee',
  attackRange: 1,
  moveSpeed: 1,
  aggroRange: 2,
};

const ARCHER: EnemyTypeDefinition = {
  id: 'archer',
  name: 'Archer',
  description: 'Ranged enemy that keeps its distance',
  icon: '🏹',
  
  baseHp: 3,
  baseDamage: 7,
  baseArmor: 0,
  xpMultiplier: 1.2,
  
  movementPattern: 'maintain-distance',
  attackPattern: 'ranged',
  attackRange: 4,
  moveSpeed: 1,
  aggroRange: 5,
};

const MAGE: EnemyTypeDefinition = {
  id: 'mage',
  name: 'Mage',
  description: 'Spellcaster that uses abilities every few turns',
  icon: '🧙',
  
  baseHp: 4,
  baseDamage: 3,
  baseArmor: 0,
  xpMultiplier: 1.5,
  
  movementPattern: 'maintain-distance',
  attackPattern: 'ranged',
  attackRange: 3,
  moveSpeed: 1,
  aggroRange: 4,
  
  abilities: [
    {
      id: 'fireball',
      name: 'Fireball',
      description: 'Launches a fireball at the player',
      icon: '🔥',
      turnInterval: 3,
      execute: (context) => {
        // Deal spell damage to player
        return {
          playerDamage: context.enemyData.damage * 2,
          visualEffect: {
            type: 'projectile',
            from: context.enemy.pos,
            to: context.playerPos,
            icon: '🔥',
          },
          combatText: [{
            kind: 'damage',
            amount: context.enemyData.damage * 2,
            pos: context.playerPos,
          }],
        };
      },
    },
  ],
};

const BRUTE: EnemyTypeDefinition = {
  id: 'brute',
  name: 'Brute',
  description: 'Slow but powerful melee enemy',
  icon: '💪',
  
  baseHp: 15,
  baseDamage: 10,
  baseArmor: 2,
  xpMultiplier: 1.3,
  
  movementPattern: 'chase',
  attackPattern: 'melee',
  attackRange: 1,
  moveSpeed: 0.5,  // Moves every other turn
  aggroRange: 3,
};

const GHOST: EnemyTypeDefinition = {
  id: 'ghost',
  name: 'Ghost',
  description: 'Teleports towards the player unpredictably',
  icon: '👻',
  
  baseHp: 6,
  baseDamage: 6,
  baseArmor: 0,
  xpMultiplier: 1.4,
  
  movementPattern: 'teleport',
  attackPattern: 'melee',
  attackRange: 1,
  moveSpeed: 1,
  aggroRange: 6,
};

const TURRET: EnemyTypeDefinition = {
  id: 'turret',
  name: 'Turret',
  description: 'Stationary enemy that fires projectiles',
  icon: '🔫',
  
  baseHp: 8,
  baseDamage: 8,
  baseArmor: 1,
  xpMultiplier: 1.1,
  
  movementPattern: 'static',
  attackPattern: 'ranged',
  attackRange: 5,
  moveSpeed: 0,  // Never moves
  aggroRange: 6,
};

// Enemy type registry
export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeDefinition> = {
  goblin: GOBLIN,
  archer: ARCHER,
  mage: MAGE,
  brute: BRUTE,
  ghost: GHOST,
  turret: TURRET,
};

// Get enemy type by ID
export function getEnemyType(id: EnemyTypeId): EnemyTypeDefinition {
  return ENEMY_TYPES[id];
}

// Create enemy data from type
export function createEnemyData(
  typeId: EnemyTypeId,
  level: number,
  spawnPos: Vec2
): EnemyData {
  const type = getEnemyType(typeId);
  
  // Apply scaling (custom or default)
  const baseStats: EnemyStats = {
    hp: type.baseHp,
    maxHp: type.baseHp,
    damage: type.baseDamage,
    armor: type.baseArmor,
    xpValue: 5,
  };
  
  const scaledStats = type.scaleStats
    ? type.scaleStats(baseStats, level)
    : defaultScaling(baseStats, level);
  
  return {
    typeId,
    level,
    hp: scaledStats.hp,
    maxHp: scaledStats.maxHp,
    damage: scaledStats.damage,
    armor: scaledStats.armor,
    xpValue: scaledStats.xpValue,
    spawnPos,
    ai: type.movementPattern === 'static' ? 'static' : 'patrol',
    state: {
      mode: type.movementPattern === 'static' ? 'static' : 'patrol',
      patrolIndex: 0,
      lastHp: scaledStats.hp,
      abilities: {},
      lastMoveTurn: 0,
    },
  };
}

// Weighted random selection
function weightedRandom<T extends { weight: number }>(
  items: T[],
  rng: () => number
): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = rng() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

// Select enemy type based on floor number
export function selectEnemyType(floorNumber: number, rng: () => number): EnemyTypeId {
  // Floor-based spawn pools with weights
  const spawnPools: Record<number, Array<{ type: EnemyTypeId; weight: number }>> = {
    1: [
      { type: 'goblin', weight: 70 },
      { type: 'turret', weight: 30 },
    ],
    2: [
      { type: 'goblin', weight: 50 },
      { type: 'archer', weight: 30 },
      { type: 'turret', weight: 20 },
    ],
    3: [
      { type: 'goblin', weight: 40 },
      { type: 'archer', weight: 25 },
      { type: 'brute', weight: 20 },
      { type: 'turret', weight: 15 },
    ],
    4: [
      { type: 'goblin', weight: 30 },
      { type: 'archer', weight: 25 },
      { type: 'brute', weight: 20 },
      { type: 'mage', weight: 15 },
      { type: 'turret', weight: 10 },
    ],
    5: [
      { type: 'goblin', weight: 20 },
      { type: 'archer', weight: 25 },
      { type: 'brute', weight: 20 },
      { type: 'mage', weight: 20 },
      { type: 'ghost', weight: 10 },
      { type: 'turret', weight: 5 },
    ],
  };
  
  // Use highest defined pool for floors beyond defined pools
  const poolKey = Math.min(floorNumber, 5);
  const pool = spawnPools[poolKey] || spawnPools[5];
  
  return weightedRandom(pool, rng).type;
}
