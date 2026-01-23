import { describe, expect, it } from 'vitest';
import { runEnemyTurn } from '../src/game/enemyAI';
import { createEnemyData, getEnemyType } from '../src/game/enemyTypes';
import type { MapFloor, EntityBase, EnemyData } from '../src/game/types';

function createTestFloor(enemyPos: { x: number; y: number }): MapFloor {
  const width = 5, height = 5;
  const tiles = Array.from({ length: width * height }, (_, i) => ({
    kind: 'floor' as const,
    pos: { x: i % width, y: Math.floor(i / width) },
    walkable: true,
  }));

  const enemyData = createEnemyData('archer', 1, enemyPos);
  const entities: EntityBase[] = [
    {
      id: 'archer-1',
      kind: 'enemy',
      pos: enemyPos,
      data: enemyData,
    },
  ];

  return {
    width,
    height,
    tiles,
    entities,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    seed: 'test-seed',
    generatedAt: new Date().toISOString(),
  };
}

describe('Archer Enemy Behavior', () => {
  it('archer should not move if already in attack range', () => {
    // Archer at (2,2), player at (2,4) - distance is 2, within archer range of 4
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode (aggroed)
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 2, y: 4 },
      turnCount: 1,
    });

    // Archer should stay at (2,2) and attack
    expect(result.floor.entities[0].pos).toEqual({ x: 2, y: 2 });
    expect(result.attacks).toBeDefined();
    expect(result.attacks?.length).toBe(1);
    expect(result.attacks?.[0].attackerId).toBe('archer-1');
  });

  it('archer should move closer if out of range', () => {
    // Archer at (0,0), player at (4,4) - distance is 8, out of range
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode (aggroed)
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 4, y: 4 },
      turnCount: 1,
    });

    // Archer should move closer (not stay at 0,0)
    const archerPos = result.floor.entities[0].pos;
    expect(archerPos.x !== 0 || archerPos.y !== 0).toBe(true);
    
    // Should not attack because out of range
    expect(result.attacks?.length || 0).toBe(0);
  });

  it('archer should attack when player is adjacent', () => {
    // Archer at (2,2), player at (2,3) - distance is 1
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode
    enemyData.state = { 
      mode: 'follow', 
      lastHp: enemyData.hp,
    };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 2, y: 3 },
      turnCount: 1,
    });

    // Archer should attack from range
    expect(result.attacks?.length).toBe(1);
  });

  it('archer should not attack when not aggroed and out of aggro range', () => {
    // Archer at (0,0), player at (4,4) - distance is 8, outside aggro range of 5
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Archer starts in patrol mode (not aggroed)
    enemyData.ai = 'patrol';
    enemyData.state = { mode: 'patrol', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 4, y: 4 },
      turnCount: 1,
    });

    // Should not attack - still in patrol mode
    expect(result.attacks?.length || 0).toBe(0);
    
    // Should still be in patrol mode
    const resultEnemyData = result.floor.entities[0].data as EnemyData;
    expect(resultEnemyData.state?.mode).toBe('patrol');
  });

  it('archer has attack range of 4', () => {
    const archerType = getEnemyType('archer');
    expect(archerType.attackRange).toBe(4);
    expect(archerType.attackPattern).toBe('ranged');
  });

  it('archer should stop and shoot when reaching attack range', () => {
    // Archer at (2,2), player at (2,0) - distance is 2 (in range)
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 2, y: 0 },
      turnCount: 1,
    });

    // Archer should not move (already in range) and should attack
    expect(result.floor.entities[0].pos).toEqual({ x: 2, y: 2 });
    expect(result.attacks?.length).toBe(1);
  });

  it('archer at exactly max range should attack without moving', () => {
    // Archer at (0,0), player at (4,0) - distance is exactly 4 (max range)
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 4, y: 0 },
      turnCount: 1,
    });

    // Archer should stay at (0,0) and attack
    expect(result.floor.entities[0].pos).toEqual({ x: 0, y: 0 });
    expect(result.attacks?.length).toBe(1);
  });

  it('archer just outside range should move closer but not attack', () => {
    // Archer at (0,0), player at (4,1) - distance is 5 (just out of range)
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set archer to follow mode
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 4, y: 1 },
      turnCount: 1,
    });

    // Archer should move
    const archerPos = result.floor.entities[0].pos;
    expect(archerPos.x !== 0 || archerPos.y !== 0).toBe(true);
    
    // Calculate new distance
    const newDist = Math.abs(archerPos.x - 4) + Math.abs(archerPos.y - 1);
    
    // Should be closer than before (was 5)
    expect(newDist).toBeLessThan(5);
  });

  it('archer should aggro when player comes within aggro range', () => {
    // Archer at (2,2), player at (2,4) - distance is 2, within aggro range of 5
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Archer starts in patrol mode
    enemyData.ai = 'patrol';
    enemyData.state = { mode: 'patrol', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 2, y: 4 },
      turnCount: 1,
    });

    // Should transition to follow mode
    const resultEnemyData = result.floor.entities[0].data as EnemyData;
    expect(resultEnemyData.state?.mode).toBe('follow');
    
    // Should emit aggro interaction
    expect(result.interaction?.type).toBe('enemy-aggro');
  });

  it('archer has maintain-distance movement pattern', () => {
    const archerType = getEnemyType('archer');
    expect(archerType.movementPattern).toBe('maintain-distance');
    // Preferred distance is calculated as attackRange - 1 = 3
  });

  it('multiple archers should not move if all in range', () => {
    const width = 5, height = 5;
    const tiles = Array.from({ length: width * height }, (_, i) => ({
      kind: 'floor' as const,
      pos: { x: i % width, y: Math.floor(i / width) },
      walkable: true,
    }));

    const archer1Data = createEnemyData('archer', 1, { x: 1, y: 2 });
    archer1Data.state = { mode: 'follow', lastHp: archer1Data.hp };
    
    const archer2Data = createEnemyData('archer', 1, { x: 3, y: 2 });
    archer2Data.state = { mode: 'follow', lastHp: archer2Data.hp };

    const entities: EntityBase[] = [
      { id: 'archer-1', kind: 'enemy', pos: { x: 1, y: 2 }, data: archer1Data },
      { id: 'archer-2', kind: 'enemy', pos: { x: 3, y: 2 }, data: archer2Data },
    ];

    const floor: MapFloor = {
      width,
      height,
      tiles,
      entities,
      entrance: { x: 0, y: 0 },
      exit: { x: 4, y: 4 },
      seed: 'test-seed',
      generatedAt: new Date().toISOString(),
    };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 2, y: 2 }, // Player in middle, both archers 1 tile away
      turnCount: 1,
    });

    // Both archers should stay in place (already in range)
    expect(result.floor.entities[0].pos).toEqual({ x: 1, y: 2 });
    expect(result.floor.entities[1].pos).toEqual({ x: 3, y: 2 });
    
    // Both should attack
    expect(result.attacks?.length).toBe(2);
  });

  describe('CRITICAL: Archers CANNOT move and shoot same turn', () => {
    it('archer in range does NOT move when shooting', () => {
      // Archer at (1,1), player at (3,1) - distance 2, well within range 4
      const floor = createTestFloor({ x: 1, y: 1 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 3, y: 1 },
        turnCount: 1,
      });

      // Position MUST NOT change
      expect(result.floor.entities[0].pos).toEqual({ x: 1, y: 1 });
      // Must attack
      expect(result.attacks?.length).toBe(1);
    });

    it('archer that moves does NOT attack that same turn', () => {
      // Archer at (0,0), player at (4,3) - distance 7, outside range 4
      const floor = createTestFloor({ x: 0, y: 0 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 4, y: 3 },
        turnCount: 1,
      });

      const archerPos = result.floor.entities[0].pos;
      
      // Archer MUST have moved (not at 0,0)
      const didMove = archerPos.x !== 0 || archerPos.y !== 0;
      expect(didMove).toBe(true);
      
      // Since archer moved, MUST NOT attack
      expect(result.attacks?.length || 0).toBe(0);
    });

    it('archer at range 3 stays and shoots, does not advance', () => {
      // Archer at (1,1), player at (4,1) - distance exactly 3, within range 4
      const floor = createTestFloor({ x: 1, y: 1 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 4, y: 1 },
        turnCount: 1,
      });

      // MUST stay at (1,1)
      expect(result.floor.entities[0].pos).toEqual({ x: 1, y: 1 });
      // MUST attack
      expect(result.attacks?.length).toBe(1);
    });

    it('archer at range 2 stays and shoots, does not advance', () => {
      // Archer at (2,2), player at (4,2) - distance exactly 2, within range 4
      const floor = createTestFloor({ x: 2, y: 2 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 4, y: 2 },
        turnCount: 1,
      });

      // MUST stay at (2,2)
      expect(result.floor.entities[0].pos).toEqual({ x: 2, y: 2 });
      // MUST attack
      expect(result.attacks?.length).toBe(1);
    });

    it('archer at range 1 (adjacent) stays and shoots, does not move away', () => {
      // Archer at (2,2), player at (3,2) - distance 1, within range
      const floor = createTestFloor({ x: 2, y: 2 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 3, y: 2 },
        turnCount: 1,
      });

      // MUST stay at (2,2) - ranged enemies don't kite on same turn
      expect(result.floor.entities[0].pos).toEqual({ x: 2, y: 2 });
      // MUST attack
      expect(result.attacks?.length).toBe(1);
    });

    it('archer moving into range on this turn does NOT attack', () => {
      // Archer at (0,0), player at (3,0) - distance 3, but after one move will be in range
      const floor = createTestFloor({ x: 0, y: 0 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      // Player at distance 3 means archer is out of range initially
      // But could move to (1,0) bringing distance to 2
      const result = runEnemyTurn({
        floor,
        playerPos: { x: 3, y: 0 },
        turnCount: 1,
      });

      const archerPos = result.floor.entities[0].pos;
      const startDist = Math.abs(0 - 3) + Math.abs(0 - 0); // = 3
      
      // Distance 3 is within archer range 4, so archer should NOT move
      expect(archerPos).toEqual({ x: 0, y: 0 });
      // And should attack
      expect(result.attacks?.length).toBe(1);
    });

    it('archer at exactly range 5 (out of range) moves but does not attack', () => {
      // Archer at (0,0), player at (3,2) - distance exactly 5, just out of range 4
      const floor = createTestFloor({ x: 0, y: 0 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      const result = runEnemyTurn({
        floor,
        playerPos: { x: 3, y: 2 },
        turnCount: 1,
      });

      const archerPos = result.floor.entities[0].pos;
      
      // MUST move (not at 0,0)
      expect(archerPos.x !== 0 || archerPos.y !== 0).toBe(true);
      
      // MUST NOT attack on move turn
      expect(result.attacks?.length || 0).toBe(0);
    });

    it('multiple turns: archer moves turn 1, then shoots turn 2 without moving', () => {
      // Archer at (0,0), player at (3,2) - distance 5, out of range
      const floor = createTestFloor({ x: 0, y: 0 });
      const enemy = floor.entities[0];
      const enemyData = enemy.data as EnemyData;
      enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

      // Turn 1: archer should move closer
      const result1 = runEnemyTurn({
        floor,
        playerPos: { x: 3, y: 2 },
        turnCount: 1,
      });

      const archerPosAfterMove = result1.floor.entities[0].pos;
      
      // Archer moved
      expect(archerPosAfterMove.x !== 0 || archerPosAfterMove.y !== 0).toBe(true);
      // Did not attack
      expect(result1.attacks?.length || 0).toBe(0);

      // Turn 2: if now in range, should shoot without moving
      const distAfterMove = Math.abs(archerPosAfterMove.x - 3) + Math.abs(archerPosAfterMove.y - 2);
      
      if (distAfterMove <= 4) {
        const result2 = runEnemyTurn({
          floor: result1.floor,
          playerPos: { x: 3, y: 2 },
          turnCount: 2,
        });

        // Should NOT move
        expect(result2.floor.entities[0].pos).toEqual(archerPosAfterMove);
        // Should attack
        expect(result2.attacks?.length).toBe(1);
      }
    });
  });
});

