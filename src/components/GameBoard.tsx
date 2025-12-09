import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { DIRECTIONS } from '../game/movement';
import { getTile } from '../game/movement';
import { Tile, EntityBase } from '../game/types';

export function GameBoard() {
  const { player, floor, turnCount, gameStarted, gameOver, victoryMessage, startNewGame, movePlayer, resetGame } = useGameStore();

  // Keyboard input handling
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [gameStarted, gameOver, movePlayer]);

  const renderTile = (tile: Tile, entities: EntityBase[]) => {
    const isPlayer = player.pos.x === tile.pos.x && player.pos.y === tile.pos.y;
    const entity = entities.find((e) => e.pos.x === tile.pos.x && e.pos.y === tile.pos.y);

    let bgColor = 'bg-slate-100';
    let content = '';
    let textColor = 'text-slate-600';

    // Tile background based on kind
    switch (tile.kind) {
      case 'wall':
        bgColor = 'bg-slate-800';
        content = '█';
        textColor = 'text-slate-800';
        break;
      case 'entrance':
        bgColor = 'bg-green-200';
        content = '↑';
        textColor = 'text-green-700';
        break;
      case 'exit':
        bgColor = 'bg-blue-200';
        content = '↓';
        textColor = 'text-blue-700';
        break;
      case 'trap':
        bgColor = 'bg-red-100';
        content = '✕';
        textColor = 'text-red-600';
        break;
      case 'chest':
        bgColor = 'bg-yellow-100';
        content = '□';
        textColor = 'text-yellow-700';
        break;
      case 'floor':
        bgColor = 'bg-slate-100';
        break;
    }

    // Entity overlay
    if (entity) {
      if (entity.kind === 'enemy') {
        content = '⚔';
        textColor = 'text-red-600';
      } else if (entity.kind === 'item') {
        content = '◆';
        textColor = 'text-purple-600';
      }
    }

    // Player overlay (highest priority)
    if (isPlayer) {
      content = '●';
      textColor = 'text-blue-600 font-bold';
    }

    return (
      <div
        key={`${tile.pos.x}-${tile.pos.y}`}
        className={`${bgColor} ${textColor} w-16 h-16 flex items-center justify-center border border-slate-300 text-2xl transition-colors duration-150`}
        title={`(${tile.pos.x}, ${tile.pos.y}) - ${tile.kind}`}
      >
        {content}
      </div>
    );
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-slate-800">25 Tiles: Sigils of Descent</h1>
          <p className="text-slate-600">A roguelike where everything is built around 5×5 grids</p>
          <button
            onClick={() => startNewGame()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
          >
            Start New Game
          </button>
          <div className="text-sm text-slate-500 mt-4">
            <p>Controls: Arrow keys or WASD to move</p>
          </div>
        </div>
      </div>
    );
  }

  if (!floor) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
      {/* Game Over Overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-800">
              {victoryMessage?.includes('completed') ? '🎉 Victory!' : '💀 Game Over'}
            </h2>
            <p className="text-slate-600">{victoryMessage}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => startNewGame()}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                New Game
              </button>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="mb-6 flex gap-8 items-center">
        <div className="text-lg">
          <span className="font-semibold">Turn:</span> {turnCount}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-red-600">HP:</span> {player.hp}/{player.maxHp}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-blue-600">MP:</span> {player.mp}/{player.maxMp}
        </div>
        <div className="text-lg">
          <span className="font-semibold">Inventory:</span> {player.inventory.length}/25
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-white p-4 rounded-lg shadow-xl">
        <div className="grid grid-cols-5 gap-0">
          {Array.from({ length: floor.height }, (_, y) =>
            Array.from({ length: floor.width }, (_, x) => {
              const tile = getTile(floor, { x, y });
              return tile ? renderTile(tile, floor.entities) : null;
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 text-center text-slate-600 space-y-2">
        <p className="text-sm">
          <span className="font-semibold">Controls:</span> Arrow keys or WASD to move
        </p>
        <p className="text-xs">
          Move to the <span className="text-blue-600 font-semibold">blue exit (↓)</span> to complete the floor
        </p>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white p-4 rounded-lg shadow text-sm">
        <div className="font-semibold mb-2">Legend:</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <div><span className="text-blue-600 font-bold">●</span> Player</div>
          <div><span className="text-red-600">⚔</span> Enemy</div>
          <div><span className="text-purple-600">◆</span> Item</div>
          <div><span className="text-slate-800">█</span> Wall</div>
          <div><span className="text-green-700">↑</span> Entrance</div>
          <div><span className="text-blue-700">↓</span> Exit</div>
          <div><span className="text-red-600">✕</span> Trap</div>
        </div>
      </div>
    </div>
  );
}
