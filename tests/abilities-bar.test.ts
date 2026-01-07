import { describe, expect, it } from 'vitest';
import { getAbilityBarFromInventory } from '../src/game/abilities';
import type { InventoryItem } from '../src/game/types';

function abilityItem(abilityId: 'fireball' | 'shockwave'): InventoryItem {
  return {
    id: `${abilityId}-item`,
    name: abilityId,
    description: abilityId,
    icon: abilityId === 'fireball' ? '🔥' : '💥',
    rarity: 'common',
    kind: 'ability-granting',
    abilityId,
    saleValue: 50,
  };
}

describe('getAbilityBarFromInventory', () => {
  it('returns 8 empty slots for empty inventory', () => {
    const inv = Array(25).fill(null);
    const bar = getAbilityBarFromInventory(inv, 8);
    expect(bar).toHaveLength(8);
    expect(bar.every((x) => x === null)).toBe(true);
  });

  it('adds unique abilities in inventory order', () => {
    const inv = Array(25).fill(null) as (InventoryItem | null)[];
    inv[3] = abilityItem('shockwave');
    inv[0] = abilityItem('fireball');

    const bar = getAbilityBarFromInventory(inv, 8);
    expect(bar[0]).toBe('fireball');
    expect(bar[1]).toBe('shockwave');
  });

  it('dedupes duplicate ability sources', () => {
    const inv = Array(25).fill(null) as (InventoryItem | null)[];
    inv[0] = abilityItem('fireball');
    inv[1] = abilityItem('fireball');

    const bar = getAbilityBarFromInventory(inv, 8);
    expect(bar.filter((x) => x === 'fireball')).toHaveLength(1);
  });

  it('caps to 8 slots', () => {
    // Since we only have 2 abilities today, simulate by repeating them.
    const inv = Array(25).fill(null) as (InventoryItem | null)[];
    for (let i = 0; i < 25; i++) {
      inv[i] = i % 2 === 0 ? abilityItem('fireball') : abilityItem('shockwave');
    }
    const bar = getAbilityBarFromInventory(inv, 8);
    expect(bar).toHaveLength(8);
    // With dedupe, only 2 abilities should appear.
    expect(bar.filter(Boolean)).toHaveLength(2);
  });
});
