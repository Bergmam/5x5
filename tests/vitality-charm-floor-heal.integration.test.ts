import { describe, expect, it } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { InventoryItem } from '../src/game/types';

function vitalityCharm(): InventoryItem {
  return {
    id: 'vitality-charm',
    name: 'Vitality Charm',
    description: 'Regain 5 HP for every floor you climb',
    icon: '❤️',
    rarity: 'rare',
    kind: 'relic',
    saleValue: 150
  };
}

describe('Vitality Charm', () => {
  it('heals 5 HP on nextFloor', () => {
    useGameStore.getState().startNewGame('vitality-seed');

    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = vitalityCharm();
      return { player: { ...s.player, hp: 50, inventory: inv } };
    });

    useGameStore.getState().nextFloor();

    const hp = useGameStore.getState().player.hp;
    expect(hp).toBe(55);
  });

  it('clamps heal to effective max HP', () => {
    useGameStore.getState().startNewGame('vitality-seed-2');

    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = vitalityCharm();
      return { player: { ...s.player, hp: 99, inventory: inv, maxHp: 100 } };
    });

    useGameStore.getState().nextFloor();

    const hp = useGameStore.getState().player.hp;
    expect(hp).toBe(100);
  });

  it('stacks by count', () => {
    useGameStore.getState().startNewGame('vitality-seed-3');

    useGameStore.setState((s) => {
      const inv = [...s.player.inventory];
      inv[0] = vitalityCharm();
      inv[1] = vitalityCharm();
      return { player: { ...s.player, hp: 50, inventory: inv } };
    });

    useGameStore.getState().nextFloor();

    const hp = useGameStore.getState().player.hp;
    expect(hp).toBe(60);
  });
});
