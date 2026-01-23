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

  const enemyData = createEnemyData('mage', 1, enemyPos);
  const entities: EntityBase[] = [
    {
      id: 'mage-1',
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

describe('Mage Enemy Abilities', () => {
  it('mage has fireball ability with 3 turn interval', () => {
    const mageType = getEnemyType('mage');
    expect(mageType.abilities).toBeDefined();
    expect(mageType.abilities?.length).toBe(1);
    expect(mageType.abilities?.[0].id).toBe('fireball');
    expect(mageType.abilities?.[0].turnInterval).toBe(3);
  });

  it('mage does not use ability when not aggroed', () => {
    // Mage at (0,0), player at (4,4) - distance 8, outside aggro range of 4
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Keep in patrol mode (not aggroed), far from player
    enemyData.ai = 'patrol';
    enemyData.state = { mode: 'patrol', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 4, y: 4 }, // Distance 8, far away
      turnCount: 3, // Turn 3, when ability should fire
    });

    // Should not have used ability (not aggroed)
    expect(result.abilityResults).toBeUndefined();
    
    // Should still be in patrol mode
    const mageData = result.floor.entities[0].data as EnemyData;
    expect(mageData.state?.mode).toBe('patrol');
  });

  it('mage uses fireball on turn 3 when aggroed', () => {
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    
    // Set mage to aggroed
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 2 }, // Close to mage
      turnCount: 3, // Turn 3 (interval is 3, so 3 - 0 = 3 >= 3)
    });

    // Should have used fireball
    expect(result.abilityResults).toBeDefined();
    expect(result.abilityResults?.length).toBe(1);
    expect(result.abilityResults?.[0].enemyId).toBe('mage-1');
    expect(result.abilityResults?.[0].playerDamage).toBeGreaterThan(0);
    expect(result.abilityResults?.[0].visualEffect?.type).toBe('projectile');
    expect(result.abilityResults?.[0].visualEffect?.icon).toBe('🔥');
  });

  it('mage does not use fireball on turn 1 or 2', () => {
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    // Turn 1
    const result1 = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 1,
    });
    expect(result1.abilityResults).toBeUndefined();

    // Turn 2
    const result2 = runEnemyTurn({
      floor: result1.floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 2,
    });
    expect(result2.abilityResults).toBeUndefined();
  });

  it('mage uses fireball again after interval passes', () => {
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    // Turn 3: first fireball
    const result3 = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 3,
    });
    expect(result3.abilityResults?.length).toBe(1);

    // Turn 4: too soon
    const result4 = runEnemyTurn({
      floor: result3.floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 4,
    });
    expect(result4.abilityResults).toBeUndefined();

    // Turn 5: too soon
    const result5 = runEnemyTurn({
      floor: result4.floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 5,
    });
    expect(result5.abilityResults).toBeUndefined();

    // Turn 6: 3 turns have passed since turn 3, should fire again
    const result6 = runEnemyTurn({
      floor: result5.floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 6,
    });
    expect(result6.abilityResults?.length).toBe(1);
  });

  it('mage fireball deals double damage', () => {
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const baseDamage = enemyData.damage;

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 3,
    });

    expect(result.abilityResults?.[0].playerDamage).toBe(baseDamage * 2);
  });

  it('mage ability state is tracked correctly', () => {
    const floor = createTestFloor({ x: 2, y: 2 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 2 },
      turnCount: 3,
    });

    // Check that ability state was recorded
    const mageData = result.floor.entities[0].data as EnemyData;
    expect(mageData.state?.abilities?.fireball).toBeDefined();
    expect(mageData.state?.abilities?.fireball.lastUsedTurn).toBe(3);
  });

  it('mage can move and use ability on same turn', () => {
    // Mage at (0,0), player at (3,0) - distance 3, within mage range
    const floor = createTestFloor({ x: 0, y: 0 });
    const enemy = floor.entities[0];
    const enemyData = enemy.data as EnemyData;
    enemyData.state = { mode: 'follow', lastHp: enemyData.hp };

    const result = runEnemyTurn({
      floor,
      playerPos: { x: 3, y: 0 },
      turnCount: 3,
    });

    // Mage should not move (already in range 3)
    expect(result.floor.entities[0].pos).toEqual({ x: 0, y: 0 });
    
    // Should use ability
    expect(result.abilityResults?.length).toBe(1);
  });

  it('multiple mages use abilities independently', () => {
    const width = 5, height = 5;
    const tiles = Array.from({ length: width * height }, (_, i) => ({
      kind: 'floor' as const,
      pos: { x: i % width, y: Math.floor(i / width) },
      walkable: true,
    }));

    const mage1Data = createEnemyData('mage', 1, { x: 1, y: 2 });
    mage1Data.state = { mode: 'follow', lastHp: mage1Data.hp };
    
    const mage2Data = createEnemyData('mage', 1, { x: 3, y: 2 });
    mage2Data.state = { mode: 'follow', lastHp: mage2Data.hp };

    const entities: EntityBase[] = [
      { id: 'mage-1', kind: 'enemy', pos: { x: 1, y: 2 }, data: mage1Data },
      { id: 'mage-2', kind: 'enemy', pos: { x: 3, y: 2 }, data: mage2Data },
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
      playerPos: { x: 2, y: 2 },
      turnCount: 3,
    });

    // Both mages should use fireball
    expect(result.abilityResults?.length).toBe(2);
    expect(result.abilityResults?.some(r => r.enemyId === 'mage-1')).toBe(true);
    expect(result.abilityResults?.some(r => r.enemyId === 'mage-2')).toBe(true);
  });
});
