import { describe, it, expect, beforeEach } from 'vitest';
import { generateFloor } from '../src/game/generator';
import {
  attemptMove,
  isValidMove,
  getAdjacentTiles,
  isInBounds,
  getTile,
  getEntityAt,
  DIRECTIONS,
  Player,
} from '../src/game/movement';
import { MapFloor, EntityBase } from '../src/game/types';

describe('Movement helpers', () => {
  let floor: MapFloor;

  beforeEach(() => {
    floor = generateFloor('test-movement', {
      width: 5,
      height: 5,
      wallDensity: 0,
      enemyBudget: 1,
      chestBudget: 1,
    });
  });

  it('isInBounds checks correctly', () => {
    expect(isInBounds({ x: 0, y: 0 }, floor)).toBe(true);
    expect(isInBounds({ x: 4, y: 4 }, floor)).toBe(true);
    expect(isInBounds({ x: -1, y: 0 }, floor)).toBe(false);
    expect(isInBounds({ x: 5, y: 0 }, floor)).toBe(false);
    expect(isInBounds({ x: 0, y: 5 }, floor)).toBe(false);
  });

  it('getTile returns correct tile', () => {
    const tile = getTile(floor, { x: 0, y: 0 });
    expect(tile).toBeDefined();
    expect(tile?.pos).toEqual({ x: 0, y: 0 });
  });

  it('getAdjacentTiles returns valid neighbors', () => {
    const adj = getAdjacentTiles({ x: 2, y: 2 }, floor);
    expect(adj.length).toBe(4);
    expect(adj).toContainEqual({ x: 2, y: 1 }); // up
    expect(adj).toContainEqual({ x: 2, y: 3 }); // down
    expect(adj).toContainEqual({ x: 1, y: 2 }); // left
    expect(adj).toContainEqual({ x: 3, y: 2 }); // right
  });

  it('getAdjacentTiles filters out-of-bounds', () => {
    const adj = getAdjacentTiles({ x: 0, y: 0 }, floor);
    expect(adj.length).toBe(2); // only right and down
    expect(adj).toContainEqual({ x: 1, y: 0 });
    expect(adj).toContainEqual({ x: 0, y: 1 });
  });
});

describe('Movement validation', () => {
  let floor: MapFloor;

  beforeEach(() => {
    floor = generateFloor('test-validation', {
      width: 5,
      height: 5,
      wallDensity: 0.2,
      enemyBudget: 0,
      chestBudget: 0,
    });
  });

  it('isValidMove returns true for adjacent walkable tile', () => {
    const from = { x: 2, y: 2 };
    const to = { x: 2, y: 3 };
    // Ensure target is walkable
    const tile = getTile(floor, to);
    if (tile && tile.walkable) {
      expect(isValidMove(from, to, floor)).toBe(true);
    }
  });

  it('isValidMove returns false for non-adjacent tile', () => {
    const from = { x: 2, y: 2 };
    const to = { x: 4, y: 4 };
    expect(isValidMove(from, to, floor)).toBe(false);
  });

  it('isValidMove returns false for out-of-bounds', () => {
    const from = { x: 0, y: 0 };
    const to = { x: -1, y: 0 };
    expect(isValidMove(from, to, floor)).toBe(false);
  });
});

describe('attemptMove', () => {
  let floor: MapFloor;
  let player: Player;

  beforeEach(() => {
    floor = generateFloor('test-attempt', {
      width: 5,
      height: 5,
      wallDensity: 0,
      enemyBudget: 0,
      chestBudget: 0,
    });
    player = {
      pos: { x: 2, y: 2 },
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      weaponDamage: 15,
      spellDamage: 20,
      armor: 5,
      inventory: [],
      gold: 0,
    };
  });

  it('successfully moves player to adjacent walkable tile', () => {
    const result = attemptMove(player, DIRECTIONS.RIGHT, floor);
    expect(result.success).toBe(true);
    expect(result.newPos).toEqual({ x: 3, y: 2 });
    // expect(player.pos).toEqual({ x: 3, y: 2 }); // No longer mutates
  });

  it('fails to move out of bounds', () => {
    player.pos = { x: 0, y: 0 };
    const result = attemptMove(player, DIRECTIONS.LEFT, floor);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('out-of-bounds');
    expect(player.pos).toEqual({ x: 0, y: 0 }); // position unchanged
  });

  it('fails to move into wall', () => {
    // Create a floor with a wall
    const blockedFloor = generateFloor('blocked', {
      width: 5,
      height: 5,
      wallDensity: 0,
      enemyBudget: 0,
      chestBudget: 0,
    });
    // Manually set a wall to the right
    const wallTile = getTile(blockedFloor, { x: 3, y: 2 });
    if (wallTile) {
      wallTile.walkable = false;
      wallTile.kind = 'wall';
    }

    player.pos = { x: 2, y: 2 };
    const result = attemptMove(player, DIRECTIONS.RIGHT, blockedFloor);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('blocked');
    expect(player.pos).toEqual({ x: 2, y: 2 });
  });

  it('picks up item when moving onto item tile', () => {
    // Add an item to the right (with itemId reference)
    const item: EntityBase = {
      id: 'test-item',
      kind: 'item',
      pos: { x: 3, y: 2 },
      data: { itemId: 'healing-potion' },
    };
    floor.entities.push(item);

    player.pos = { x: 2, y: 2 };
    const result = attemptMove(player, DIRECTIONS.RIGHT, floor);
    expect(result.success).toBe(true);
    expect(result.pickedUpItem).toBeDefined();
    expect(result.pickedUpItem?.id).toBe('healing-potion');
    
    // Check return values instead of mutation
    expect(result.newInventory).toBeDefined();
    expect(result.newInventory?.filter(i => i !== null).length).toBe(1);
    expect(result.itemEntityIdToRemove).toBe('test-item');
    
    // Verify no mutation
    expect(player.inventory.length).toBe(0);
    expect(getEntityAt(floor, { x: 3, y: 2 })).toEqual(item);
  });

  it('does not move when colliding with enemy', () => {
    // Add an enemy to the right
    const enemy: EntityBase = {
      id: 'test-enemy',
      kind: 'enemy',
      pos: { x: 3, y: 2 },
      data: { hp: 50 },
    };
    floor.entities.push(enemy);

    player.pos = { x: 2, y: 2 };
    const result = attemptMove(player, DIRECTIONS.RIGHT, floor);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('enemy-collision');
    expect(result.attackedEnemy).toEqual(enemy);
    expect(player.pos).toEqual({ x: 2, y: 2 }); // position unchanged
  });

  it('triggers trap when moving onto trap tile', () => {
    // Set right tile as trap
    const trapTile = getTile(floor, { x: 3, y: 2 });
    if (trapTile) {
      trapTile.kind = 'trap';
    }

    player.pos = { x: 2, y: 2 };
    const result = attemptMove(player, DIRECTIONS.RIGHT, floor);
    expect(result.success).toBe(true);
    expect(result.triggeredTrap).toBe(true);
    expect(result.newPos).toEqual({ x: 3, y: 2 });
  });

  it('triggers exit when moving onto exit tile', () => {
    // Move player adjacent to exit
    player.pos = { x: floor.exit.x - 1, y: floor.exit.y };
    const direction = DIRECTIONS.RIGHT;

    const result = attemptMove(player, direction, floor);
    expect(result.success).toBe(true);
    expect(result.triggeredExit).toBe(true);
  });

  it('does not pick up item when inventory is full', () => {
    // Fill inventory with test items
    player.inventory = Array.from({ length: 25 }, (_, i) => ({
      id: `filler-${i}`,
      name: 'Test Item',
      description: 'A test item',
      icon: '📦',
      rarity: 'common' as const,
      kind: 'passive' as const,
      saleValue: 10,
    }));

    // Add an item to the right (with itemId in data)
    const item: EntityBase = {
      id: 'test-item',
      kind: 'item',
      pos: { x: 3, y: 2 },
      data: { itemId: 'healing-potion' }, // Reference to item definition
    };
    floor.entities.push(item);

    player.pos = { x: 2, y: 2 };
    const result = attemptMove(player, DIRECTIONS.RIGHT, floor);
    expect(result.success).toBe(true);
    expect(result.pickedUpItem).toBeUndefined();
    expect(getEntityAt(floor, { x: 3, y: 2 })).toEqual(item); // item still there
  });
});
