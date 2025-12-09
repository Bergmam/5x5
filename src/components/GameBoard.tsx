import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { DIRECTIONS } from '../game/movement';
import { getTile } from '../game/movement';
import { Tile, EntityBase } from '../game/types';
import { getInventoryCount } from '../game/inventory';
import InventoryPanel from './InventoryPanel';

export function GameBoard() {
  const { player, floor, turnCount, floorNumber, gameStarted, gameOver, victoryMessage, startNewGame, movePlayer, resetGame, toggleInventory } = useGameStore();

  // Keyboard input handling
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle inventory toggle
      if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
        e.preventDefault();
        toggleInventory();
        return;
      }

      // Don't handle movement if game is over
      if (gameOver) return;

      // Prevent default browser behavior for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          movePlayer(DIRECTIONS.UP);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          movePlayer(DIRECTIONS.DOWN);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          movePlayer(DIRECTIONS.LEFT);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          movePlayer(DIRECTIONS.RIGHT);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, movePlayer, toggleInventory]);

  const renderTile = (tile: Tile, entities: EntityBase[]) => {
    const isPlayer = player.pos.x === tile.pos.x && player.pos.y === tile.pos.y;
    const entity = entities.find((e) => e.pos.x === tile.pos.x && e.pos.y === tile.pos.y);

    let bgColor = 'bg-gray-800';
    let content = '';
    let textColor = 'text-gray-400';

    // Tile background based on kind
    switch (tile.kind) {
      case 'wall':
        bgColor = 'bg-gray-950';
        content = '█';
        textColor = 'text-gray-950';
        break;
      case 'entrance':
        bgColor = 'bg-green-900';
        content = '↑';
        textColor = 'text-green-400';
        break;
      case 'exit':
        bgColor = 'bg-blue-900';
        content = '↓';
        textColor = 'text-blue-400';
        break;
      case 'trap':
        bgColor = 'bg-red-950';
        content = '✕';
        textColor = 'text-red-400';
        break;
      case 'chest':
        bgColor = 'bg-yellow-950';
        content = '□';
        textColor = 'text-yellow-400';
        break;
      case 'floor':
        bgColor = 'bg-gray-800';
        break;
    }

    // Entity overlay
    if (entity) {
      if (entity.kind === 'enemy') {
        content = '⚔';
        textColor = 'text-red-400';
      } else if (entity.kind === 'item') {
        content = '◆';
        textColor = 'text-purple-400';
      }
    }

    // Player overlay (highest priority)
    if (isPlayer) {
      content = '●';
      textColor = 'text-cyan-400 font-bold';
    }

    return (
      <div
        key={`${tile.pos.x}-${tile.pos.y}`}
        className={`${bgColor} ${textColor} w-16 h-16 flex items-center justify-center border border-gray-700 text-2xl transition-colors duration-150`}
        title={`(${tile.pos.x}, ${tile.pos.y}) - ${tile.kind}`}
      >
        {content}
      </div>
    );
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-100">5x5 RPG</h1>
          <button
            onClick={() => startNewGame()}
            className="px-8 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors text-lg font-semibold"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  if (!floor) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-100">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-8">
      {/* Game Over Overlay - only for death */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-lg shadow-xl text-center space-y-4">
            <h2 className="text-3xl font-bold text-red-400">💀 Game Over</h2>
            <p className="text-gray-300">{victoryMessage}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => startNewGame()}
                className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors"
              >
                New Game
              </button>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="mb-6 flex gap-8 items-center text-gray-100">
        <div className="text-lg">
          <span className="font-semibold">Floor:</span> {floorNumber}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-red-400">HP:</span> {player.hp}/{player.maxHp}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-cyan-400">MP:</span> {player.mp}/{player.maxMp}
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700">
        <div className="grid grid-cols-5 gap-0">
          {Array.from({ length: floor.height }, (_, y) =>
            Array.from({ length: floor.width }, (_, x) => {
              const tile = getTile(floor, { x, y });
              return tile ? renderTile(tile, floor.entities) : null;
            })
          )}
        </div>
      </div>

      {/* Right Side Button Container */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={toggleInventory}
          className="w-16 h-16 bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 rounded flex items-center justify-center text-3xl transition-colors"
          title="Toggle Inventory (I)"
        >
          🎒
        </button>
      </div>

      {/* Controls */}
      <div className="mt-6 text-center text-gray-400 space-y-2">
        <p className="text-sm">
          <span className="font-semibold">Controls:</span> Arrow keys or WASD to move | I or Tab for Inventory
        </p>
        <p className="text-xs">
          Move to the <span className="text-blue-400 font-semibold">blue exit (↓)</span> to complete the floor
        </p>
      </div>

      {/* Inventory Panel */}
      <InventoryPanel />
    </div>
  );
}
