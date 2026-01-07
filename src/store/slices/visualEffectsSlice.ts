import type { StoreApi } from 'zustand';
import type { GameState } from '../gameStore';
import type { AbilityId } from '../../game/abilities';

/**
 * Visual Effects Slice
 * 
 * Manages all visual feedback systems including:
 * - Floating combat text (damage numbers, heals, MP costs)
 * - Interaction animations (attacks, bumps, ability casts)
 * - Animation timing and cleanup
 */

export interface VisualEffectsSlice {
  // Animation state for attacks, bumps, and abilities
  interaction: {
    type: 'attack' | 'bump' | 'enemy-aggro' | 'enemy-attack' | 'ability';
    targetPos: { x: number; y: number };
    timestamp: number;
    attackerId?: string;
    aggroEnemyIds?: string[];
    abilityId?: AbilityId;
  } | null;

  // Floating combat text (damage numbers, heals, MP restoration)
  combatText: Array<{
    id: string;
    kind: 'damage' | 'heal' | 'mp';
    amount: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    icon: string;
    createdAt: number;
    ttlMs: number;
  }>;

  // Internal actions (called from other slices)
  _enqueueCombatText: (
    events: VisualEffectsSlice['combatText'][number] | Array<VisualEffectsSlice['combatText'][number]>
  ) => void;
  _removeCombatText: (id: string) => void;
}

/**
 * Generate a unique ID for combat text events
 */
function makeCombatTextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const createVisualEffectsSlice = (
  set: StoreApi<GameState>['setState'],
  get: StoreApi<GameState>['getState']
): VisualEffectsSlice => ({
  interaction: null,
  combatText: [],

  _removeCombatText: (id: string) => {
    set((s) => ({ combatText: s.combatText.filter((e) => e.id !== id) }));
  },

  _enqueueCombatText: (events) => {
    const batch = Array.isArray(events) ? events : [events];
    if (batch.length === 0) return;

    set((s) => {
      const next = [...s.combatText, ...batch];
      // Cap to avoid unbounded growth if something goes wrong
      const capped = next.length > 30 ? next.slice(next.length - 30) : next;
      return { combatText: capped };
    });

    // Schedule expiry per event
    for (const e of batch) {
      setTimeout(() => {
        get()._removeCombatText(e.id);
      }, e.ttlMs);
    }
  },
});

// Export the ID generator for use in other slices
export { makeCombatTextId };
