export type Vec2 = { x: number; y: number };

export type TileKind =
  | 'floor'
  | 'wall'
  | 'entrance'
  | 'exit'
  | 'door'
  | 'trap'
  | 'chest'
  | 'water';

export interface Tile {
  pos: Vec2;
  kind: TileKind;
  walkable: boolean;
  blocksVision?: boolean;
  meta?: Record<string, unknown>;
}

export interface EnemyData {
  // Identity
  typeId?: import('./enemyTypes').EnemyTypeId; // NEW: Which enemy type (optional for backward compatibility)
  
  // Stats
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  xpValue: number;
  level: number;
  
  // AI (deprecated but kept for backward compatibility)
  ai?: 'static' | 'patrol' | 'follow';
  spawnPos?: Vec2;
  
  // State
  state?: {
    mode: 'static' | 'patrol' | 'follow';
    patrolIndex?: number;
    lastHp?: number;
    
    // NEW: Ability tracking
    lastMoveTurn?: number;     // For slow enemies
    abilities?: {
      [abilityId: string]: {
        lastUsedTurn: number;
      };
    };
    
    // NEW: Attack pattern state
    attackCooldown?: number;   // Turns until can attack again
    preferredDistance?: number; // For maintain-distance enemies
  };
}

export interface EntityBase {
  id: string;
  kind: 'enemy' | 'item' | 'relic' | 'npc';
  pos: Vec2;
  data?: Record<string, unknown> | EnemyData;
}

export interface MapFloor {
  width: number;
  height: number;
  seed: string;
  tiles: Tile[]; // row-major length == width*height
  entities: EntityBase[];
  entrance: Vec2;
  exit: Vec2;
  generatedAt: string;
  version?: string;
}

export interface GenerationConfig {
  width: number;
  height: number;
  wallDensity: number; // 0..1
  enemyBudget: number;
  chestBudget: number;
  minPathLength?: number;
  entrance?: Vec2;
  exit?: Vec2;
  useTemplate?: boolean;
  templateId?: string;
  floorNumber?: number;
}

export interface InventoryItem {
  id: string; // unique item type id
  name: string;
  description: string;
  icon: string; // emoji
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  kind: 'consumable' | 'passive' | 'ability-granting' | 'relic';
  saleValue: number; // gold value for selling in shop

  // Passive stat bonuses provided while the item exists anywhere in the inventory.
  // This is intentionally a stat-keyed map so it can be extended by adding new keys
  // to the PlayerStatKey union (no need to add new struct fields).
  stats?: Partial<Record<import('./stats').PlayerStatKey, number>>;
  
  consumable?: {
    healHp?: number;
    restoreMp?: number;
  };
  
  abilityId?: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  armor: number;
  weaponDamage: number;
  spellDamage: number;
  gold: number;
  pos: Vec2;
  inventory: (InventoryItem | null)[]; // 25 slots
}
