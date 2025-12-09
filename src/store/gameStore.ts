import { create } from 'zustand';
import { MapFloor } from '../game/types';
import { Player, attemptMove, Direction, MoveResult } from '../game/movement';
import { generateFloor } from '../game/generator';

interface GameState {
  // Current game state
  player: Player;
  floor: MapFloor | null;
  turnCount: number;
  gameStarted: boolean;
  gameOver: boolean;
  victoryMessage: string | null;
  
  // Actions
  startNewGame: (seed?: string) => void;
  movePlayer: (direction: Direction) => MoveResult;
  resetGame: () => void;
}

const createInitialPlayer = (): Player => ({
  pos: { x: 0, y: 0 },
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  weaponDamage: 15,
  spellDamage: 20,
  armor: 5,
  inventory: [],
});

export const useGameStore = create<GameState>((set, get) => ({
  player: createInitialPlayer(),
  floor: null,
  turnCount: 0,
  gameStarted: false,
  gameOver: false,
  victoryMessage: null,

  startNewGame: (seed?: string) => {
    const floorSeed = seed || `floor-${Date.now()}`;
    const newFloor = generateFloor(floorSeed, {
      width: 5,
      height: 5,
      wallDensity: 0.15,
      enemyBudget: 3,
      chestBudget: 2,
      minPathLength: 5,
    });

    const newPlayer = createInitialPlayer();
    newPlayer.pos = { ...newFloor.entrance };

    set({
      player: newPlayer,
      floor: newFloor,
      turnCount: 0,
      gameStarted: true,
      gameOver: false,
      victoryMessage: null,
    });
  },

  movePlayer: (direction: Direction): MoveResult => {
    const state = get();
    
    if (!state.floor || state.gameOver) {
      return { success: false, reason: 'game-not-active' };
    }

    const result = attemptMove(state.player, direction, state.floor);

    if (result.success) {
      set((state) => ({
        turnCount: state.turnCount + 1,
      }));

      // Check for victory condition
      if (result.triggeredExit) {
        set({
          gameOver: true,
          victoryMessage: 'Floor completed! You reached the exit.',
        });
      }

      // Handle trap damage (placeholder - will be expanded with combat system)
      if (result.triggeredTrap) {
        const trapDamage = 10; // multiples of 5
        set((state) => ({
          player: {
            ...state.player,
            hp: Math.max(0, state.player.hp - trapDamage),
          },
        }));

        // Check for death
        if (get().player.hp <= 0) {
          set({
            gameOver: true,
            victoryMessage: 'You died! A trap dealt fatal damage.',
          });
        }
      }

      // TODO: Execute enemy turns here
      // For now, we'll skip enemy AI until combat system is implemented
    }

    return result;
  },

  resetGame: () => {
    set({
      player: createInitialPlayer(),
      floor: null,
      turnCount: 0,
      gameStarted: false,
      gameOver: false,
      victoryMessage: null,
    });
  },
}));
