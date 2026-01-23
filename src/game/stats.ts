import type { InventoryItem } from './types';

// Single source of truth for player stat keys.
// Add new keys here and the rest of the system (UI + calc) should be able to follow.
export type PlayerStatKey = 'maxHp' | 'maxMp' | 'armor' | 'weaponDamage' | 'spellDamage' | 'hpPerFloor';

export const PLAYER_STAT_ORDER: PlayerStatKey[] = [
  'maxHp',
  'maxMp',
  'weaponDamage',
  'spellDamage',
  'armor',
  'hpPerFloor',
];

export const PLAYER_STAT_LABELS: Record<PlayerStatKey, string> = {
  maxHp: 'Max HP',
  maxMp: 'Max MP',
  weaponDamage: 'Weapon Damage',
  spellDamage: 'Spell Damage',
  armor: 'Armor',
  hpPerFloor: 'HP regained per Floor',
};

export type PlayerStats = Record<PlayerStatKey, number>;

export function emptyPlayerStats(): PlayerStats {
  return {
    maxHp: 0,
    maxMp: 0,
    armor: 0,
    weaponDamage: 0,
    spellDamage: 0,
    hpPerFloor: 0,
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
  const stats = addStats(base, getInventoryStatBonuses(inventory));
  
  // Calculate HP per floor from Vitality Charms (5 HP per charm)
  const vitalityCharmCount = inventory.filter((i) => i?.id === 'vitality-charm').length;
  stats.hpPerFloor = 5 * vitalityCharmCount;
  
  return stats;
}
