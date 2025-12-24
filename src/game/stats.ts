import type { InventoryItem } from './types';

// Single source of truth for player stat keys.
// Add new keys here and the rest of the system (UI + calc) should be able to follow.
export type PlayerStatKey = 'maxHp' | 'maxMp' | 'armor' | 'weaponDamage' | 'spellDamage';

export const PLAYER_STAT_ORDER: PlayerStatKey[] = [
  'maxHp',
  'maxMp',
  'weaponDamage',
  'spellDamage',
  'armor',
];

export const PLAYER_STAT_LABELS: Record<PlayerStatKey, string> = {
  maxHp: 'Max HP',
  maxMp: 'Max MP',
  weaponDamage: 'Weapon Damage',
  spellDamage: 'Spell Damage',
  armor: 'Armor',
};

export type PlayerStats = Record<PlayerStatKey, number>;

export function emptyPlayerStats(): PlayerStats {
  return {
    maxHp: 0,
    maxMp: 0,
    armor: 0,
    weaponDamage: 0,
    spellDamage: 0,
  };
}

export function addStats(a: PlayerStats, b: Partial<PlayerStats>): PlayerStats {
  const out = { ...a };
  (Object.keys(b) as PlayerStatKey[]).forEach((k) => {
    const v = b[k];
    if (typeof v === 'number') out[k] = (out[k] ?? 0) + v;
  });
  return out;
}

export function getInventoryStatBonuses(inventory: (InventoryItem | null)[]): Partial<PlayerStats> {
  const bonuses: Partial<PlayerStats> = {};
  for (const item of inventory) {
    if (!item?.stats) continue;
    for (const [k, v] of Object.entries(item.stats)) {
      if (typeof v !== 'number') continue;
      bonuses[k as PlayerStatKey] = (bonuses[k as PlayerStatKey] ?? 0) + v;
    }
  }
  return bonuses;
}

export function calculateEffectiveStats(base: PlayerStats, inventory: (InventoryItem | null)[]): PlayerStats {
  return addStats(base, getInventoryStatBonuses(inventory));
}
