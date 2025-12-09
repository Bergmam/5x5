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
