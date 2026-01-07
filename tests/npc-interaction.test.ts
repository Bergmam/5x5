import { describe, it, expect } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { DIRECTIONS } from '../src/game/movement';

describe('NPC Interaction', () => {
  it('opens shop when walking into shopkeeper', () => {
    useGameStore.getState().startNewGame('npc-test', false);
    
    // Manually create a floor with a shopkeeper next to the player
    const state = useGameStore.getState();
    const playerPos = state.player.pos;
    
    useGameStore.setState((s) => ({
      floor: {
        ...s.floor!,
        entities: [
          ...s.floor!.entities,
          {
            id: 'test-shopkeeper',
            kind: 'npc',
            pos: { x: playerPos.x + 1, y: playerPos.y }, // Shopkeeper to the right of player
            data: { npcType: 'shopkeeper' },
          },
        ],
      },
    }));

    // Verify shop is closed initially
    expect(useGameStore.getState().shopOpen).toBe(false);
    expect(useGameStore.getState().inventoryOpen).toBe(false);

    // Try to move into the shopkeeper
    useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);

    // Shop should now be open
    const finalState = useGameStore.getState();
    expect(finalState.shopOpen).toBe(true);
    expect(finalState.inventoryOpen).toBe(true); // Inventory should also open
    expect(finalState.shopInventory.some(item => item !== null)).toBe(true);
    
    // Player should not have moved
    expect(finalState.player.pos).toEqual(playerPos);
  });

  it('closes shop when moving away from shopkeeper', () => {
    useGameStore.getState().startNewGame('npc-close-test', false);
    
    // Manually create a floor with a shopkeeper next to the player
    const state = useGameStore.getState();
    const playerPos = state.player.pos;
    
    useGameStore.setState((s) => ({
      floor: {
        ...s.floor!,
        entities: [
          ...s.floor!.entities,
          {
            id: 'test-shopkeeper',
            kind: 'npc',
            pos: { x: playerPos.x + 1, y: playerPos.y }, // Shopkeeper to the right of player
            data: { npcType: 'shopkeeper' },
          },
        ],
      },
    }));

    // Open the shop by walking into shopkeeper
    useGameStore.getState().movePlayer(DIRECTIONS.RIGHT);
    
    // Verify shop is open and player is still at original position (didn't move into NPC)
    expect(useGameStore.getState().shopOpen).toBe(true);
    expect(useGameStore.getState().inventoryOpen).toBe(true);
    expect(useGameStore.getState().player.pos).toEqual(playerPos);

    // Move away from shopkeeper (move up, which should succeed and put us 2 tiles away diagonally)
    useGameStore.getState().movePlayer(DIRECTIONS.UP);

    // Shop should now be closed because we're more than 1 tile away
    const afterMove = useGameStore.getState();
    expect(afterMove.shopOpen).toBe(false);
    expect(afterMove.inventoryOpen).toBe(false);
  });
});
