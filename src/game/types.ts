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

export interface EntityBase {
  id: string;
  kind: 'enemy' | 'item' | 'relic' | 'npc';
  pos: Vec2;
  data?: Record<string, unknown>;
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
}

export interface InventoryItem {
  id: string; // unique item type id
  name: string;
  description: string;
  icon: string; // emoji
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  kind: 'consumable' | 'passive' | 'ability-granting' | 'relic';
  
  stats?: {
    hpBonus?: number;
    mpBonus?: number;
    armorBonus?: number;
    weaponDamageBonus?: number;
    spellDamageBonus?: number;
  };
  
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
  pos: Vec2;
  inventory: (InventoryItem | null)[]; // 25 slots
}
