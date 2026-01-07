import { describe, it, expect } from 'vitest';
import { calculateEffectiveStats, type PlayerStats } from '../src/game/stats';
import type { InventoryItem } from '../src/game/types';

describe('effective player stats', () => {
  it('aggregates passive stat bonuses across inventory', () => {
    const base: PlayerStats = {
      maxHp: 100,
      maxMp: 50,
      armor: 0,
      weaponDamage: 10,
      spellDamage: 5,
    };

    const inv: (InventoryItem | null)[] = Array(25).fill(null);
    inv[0] = {
      id: 'iron-plate',
      name: 'Iron Plate',
      description: 'A sturdy piece of metal',
      icon: '🛡️',
      rarity: 'uncommon',
      kind: 'passive',
      stats: { armor: 5 },
      saleValue: 40,
    };
    inv[1] = {
      id: 'sharp-blade',
      name: 'Sharp Blade',
      description: 'A well-honed weapon',
      icon: '🗡️',
      rarity: 'rare',
      kind: 'passive',
      stats: { weaponDamage: 10 },
      saleValue: 60,
    };
    inv[2] = {
      id: 'mana-crystal',
      name: 'Mana Crystal',
      description: 'Pulsing with arcane energy',
      icon: '💎',
      rarity: 'epic',
      kind: 'passive',
      stats: { maxMp: 15, spellDamage: 5 },
      saleValue: 100,
    };

    const effective = calculateEffectiveStats(base, inv);
    expect(effective).toEqual({
      maxHp: 100,
      maxMp: 65,
      armor: 5,
      weaponDamage: 20,
      spellDamage: 10,
    });
  });

  it('ignores missing stats and null items', () => {
    const base: PlayerStats = {
      maxHp: 100,
      maxMp: 50,
      armor: 5,
      weaponDamage: 15,
      spellDamage: 20,
    };

    const inv: (InventoryItem | null)[] = [
      null,
      {
        id: 'no-stats',
        name: 'Junk',
        description: 'No stats',
        icon: '🪨',
        rarity: 'common',
        kind: 'passive',
        saleValue: 10,
      },
    ];

    const effective = calculateEffectiveStats(base, inv);
    expect(effective).toEqual(base);
  });
});
