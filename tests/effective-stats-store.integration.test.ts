import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { MapFloor, EntityBase } from '../src/game/types';
import { DIRECTIONS } from '../src/game/movement';

function makeOpenFloorWithAdjacentEnemy(enemyDamage: number): MapFloor {
  const width = 5;
  const height = 5;
  const tiles = Array.from({ length: width * height }, (_, i) => ({
    kind: 'floor' as const,
    pos: { x: i % width, y: Math.floor(i / width) },
    walkable: true,
  }));

  return {
    width,
    height,
    tiles,
    entrance: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
    entities: [
      {
        id: 'e1',
        kind: 'enemy',
        pos: { x: 1, y: 0 },
        data: {
          hp: 10,
          maxHp: 10,
          damage: enemyDamage,
          armor: 0,
          xpValue: 0,
          level: 1,
          ai: 'follow',
          spawnPos: { x: 1, y: 0 },
          state: { mode: 'follow', lastHp: 10 },
        },
      },
    ],
    seed: 'effective-stats-seed',
    generatedAt: new Date().toISOString(),
  };
}

describe('store integration: effective stats are used', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('uses effective armor when enemies deal damage', () => {
    const floor = makeOpenFloorWithAdjacentEnemy(15);

    const armorItem = {
      id: 'iron-plate',
      name: 'Iron Plate',
      description: 'A sturdy piece of metal',
      icon: '🛡️',
      rarity: 'uncommon',
      kind: 'passive',
      stats: { armor: 10 },
    } as any;

    const inv = Array(25).fill(null);
    inv[0] = armorItem;

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
        hp: 100,
        maxHp: 100,
        armor: 0,
        inventory: inv,
      },
      floor,
    });

    // Act: no-op move (LEFT out-of-bounds) to advance enemy turn.
    useGameStore.getState().movePlayer(DIRECTIONS.LEFT);

    const s = useGameStore.getState();
    // Expected damage: max(5, enemyDamage - effectiveArmor)
    // effectiveArmor = 10
    expect(s.player.hp).toBe(100 - Math.max(5, 15 - 10));
  });

  it('uses effective weaponDamage when player attacks', () => {
    const floor = makeOpenFloorWithAdjacentEnemy(5);

    const weaponItem = {
      id: 'sharp-blade',
      name: 'Sharp Blade',
      description: 'A well-honed weapon',
      icon: '🗡️',
      rarity: 'rare',
      kind: 'passive',
      stats: { weaponDamage: 10 },
    } as any;

    const inv = Array(25).fill(null);
    inv[0] = weaponItem;

    useGameStore.setState({
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
      floorNumber: 1,
      turnCount: 0,
      interaction: null,
      player: {
        ...useGameStore.getState().player,
        pos: { x: 0, y: 0 },
        weaponDamage: 5,
        inventory: inv,
      },
      floor,
    });

    // Act: attempt to move into enemy tile: counts as attack.
    useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);

    const s = useGameStore.getState();
  // Enemy may have died and been removed from the floor.
  const e1 = s.floor!.entities.find((e: EntityBase) => e.id === 'e1');

    const effectiveWeaponDamage = 5 + 10;
    const expectedDamage = Math.max(5, effectiveWeaponDamage - 0);
    if (10 - expectedDamage <= 0) {
      expect(e1).toBeUndefined();
    } else {
      expect((e1 as any).data.hp).toBe(10 - expectedDamage);
    }
  });
});
