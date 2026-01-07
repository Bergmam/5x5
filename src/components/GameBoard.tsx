import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { DIRECTIONS } from '../game/movement';
import { getTile } from '../game/movement';
import { Tile, EnemyData } from '../game/types';
import InventoryPanel from './InventoryPanel';
import ShopPanel from './ShopPanel';
import ItemTooltip from './ItemTooltip';
import type { InventoryItem } from '../game/types';
import { getItemById } from '../data/itemLoader';
import StatsPanel from './StatsPanel';
import { calculateEffectiveStats } from '../game/stats';
import EnemyTooltip from './EnemyTooltip';
import AbilityBar from './AbilityBar';

export function GameBoard() {
  const { player, floor, floorNumber, gameStarted, gameOver, victoryMessage, interaction, combatText, lastMoveDirection, shopOpen, shopInventory, selectedShopSlot, startNewGame, movePlayer, resetGame, toggleInventory, selectShopItem, buyShopItem } = useGameStore();
  const [animating, setAnimating] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{
    item: InventoryItem;
    position: { x: number; y: number };
  } | null>(null);
  const [hoveredEnemy, setHoveredEnemy] = useState<{
    enemy: EnemyData;
    position: { x: number; y: number };
  } | null>(null);
  const TILE_SIZE = 64; // matches w-16 h-16 (~64px)

  // Track previous positions to animate smooth movement
  const prevPlayerPos = useRef(player.pos);
  const prevEnemyPos = useRef<Map<string, { x: number; y: number }>>(new Map());
  const recentMoveOffsets = useRef<Map<string, { dx: number; dy: number; at: number }>>(new Map());
  const resetAnimatingIds = useRef<Set<string>>(new Set());

  // When floor changes (new seed), clear cached positions so enemies don't appear to slide
  // from their previous-floor locations.
  const prevFloorSeed = useRef<string | null>(null);
  useEffect(() => {
    if (!floor) return;
    if (prevFloorSeed.current === null) {
      prevFloorSeed.current = floor.seed;
      return;
    }
    if (prevFloorSeed.current !== floor.seed) {
      prevFloorSeed.current = floor.seed;
      prevEnemyPos.current = new Map();
      recentMoveOffsets.current = new Map();
      resetAnimatingIds.current = new Set();
    }
  }, [floor]);

  // Capture previous positions and compute move offsets when floor/entities update
  useEffect(() => {
    if (!floor) return;
    const now = Date.now();

    // Player movement offset
    const pdx = player.pos.x - prevPlayerPos.current.x;
    const pdy = player.pos.y - prevPlayerPos.current.y;
    if (pdx !== 0 || pdy !== 0) {
      recentMoveOffsets.current.set('player', { dx: pdx, dy: pdy, at: now });
      prevPlayerPos.current = { ...player.pos };
    }

    // Enemy movement offsets
    const last = prevEnemyPos.current;
    const next = new Map<string, { x: number; y: number }>();
    floor.entities.forEach((e) => {
      next.set(e.id, { ...e.pos });
      const prev = last.get(e.id);
      if (prev && (prev.x !== e.pos.x || prev.y !== e.pos.y)) {
        recentMoveOffsets.current.set(e.id, { dx: e.pos.x - prev.x, dy: e.pos.y - prev.y, at: now });
        // prepare reset after mount
        resetAnimatingIds.current.delete(e.id);
      }
    });
    prevEnemyPos.current = next;
  }, [floor, player.pos]);

  // Reset animation state when interaction changes
  useEffect(() => {
    if (interaction) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [interaction]);

  // Keyboard input handling
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle ESC to close shop
      if (e.key === 'Escape' && shopOpen) {
        e.preventDefault();
        toggleInventory(); // Close inventory
        useGameStore.getState().toggleShop(); // Close shop
        return;
      }

      // Handle inventory toggle
      if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
        e.preventDefault();
        // If shop is open, don't toggle inventory (it should stay open)
        if (!shopOpen) {
          toggleInventory();
        }
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
  }, [gameStarted, gameOver, movePlayer, toggleInventory, shopOpen]);

  const renderTile = (tile: Tile) => {
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

    return (
      <div
        key={`${tile.pos.x}-${tile.pos.y}`}
        className={`${bgColor} ${textColor} w-16 h-16 flex items-center justify-center border border-gray-700 text-2xl transition-colors duration-150 relative`}
        title={`(${tile.pos.x}, ${tile.pos.y}) - ${tile.kind}`}
      >
        <div>{content}</div>
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

  const effectiveStats = calculateEffectiveStats(
    {
      maxHp: player.maxHp,
      maxMp: player.maxMp,
      armor: player.armor,
      weaponDamage: player.weaponDamage,
      spellDamage: player.spellDamage,
    },
    player.inventory
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-8">
      {/* Floating combat text keyframes */}
      <style>{`
        @keyframes combat-floater {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) translate(0px, 0px) scale(0.6);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) translate(0px, -2px) scale(1.25);
          }
          35% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) translate(0px, -10px) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) translate(0px, -26px) scale(1);
          }
        }

        @keyframes combat-splat {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) scale(0.6) rotate(0deg);
          }
          10% {
            opacity: 0.95;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) scale(1) rotate(6deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--jx), var(--jy)) scale(1.15) rotate(-8deg);
          }
        }
      `}</style>
      {/* Game Over Overlay - only for death */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-lg shadow-xl text-center space-y-4">
            <h2 className="text-3xl font-bold text-red-400">💀 Game Over</h2>
            <p className="text-gray-300">{victoryMessage}</p>
            <div className="flex gap-4 justify-center">
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
          <span className="font-semibold text-red-400">HP:</span> {player.hp}/{effectiveStats.maxHp}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-cyan-400">MP:</span> {player.mp}/{effectiveStats.maxMp}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-yellow-400">Gold:</span> {player.gold}
        </div>
      </div>

      {/* Left Side Stats Panel */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 hidden md:block">
        <StatsPanel stats={effectiveStats} />
      </div>

      {/* Bottom ability bar */}
      <AbilityBar />

      {/* Game Board with overlayed entities */}
      <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 p-4">
        <div className="relative" style={{ width: TILE_SIZE * floor.width, height: TILE_SIZE * floor.height }}>
          {/* Tiles grid */}
          <div className="grid grid-cols-5 gap-0 absolute top-0 left-0 w-full h-full">
            {Array.from({ length: floor.height }, (_, y) =>
              Array.from({ length: floor.width }, (_, x) => {
                const tile = getTile(floor, { x, y });
                return tile ? renderTile(tile) : null;
              })
            )}
          </div>

          {/* Entities overlay layer aligned to grid */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Floating combat text overlay */}
            {combatText.map((e) => {
              // RuneScape-ish: anchor near the target, not midway.
              const anchorCx = e.to.x * TILE_SIZE + TILE_SIZE / 2;
              const anchorCy = e.to.y * TILE_SIZE + TILE_SIZE / 2;
              const toCx = e.to.x * TILE_SIZE + TILE_SIZE / 2;
              const toCy = e.to.y * TILE_SIZE + TILE_SIZE / 2;
              void toCx;
              void toCy;

              // Small deterministic-ish jitter seeded by id hash (stable across re-renders)
              let h = 0;
              for (let i = 0; i < e.id.length; i++) h = (h * 31 + e.id.charCodeAt(i)) >>> 0;
              const jx = ((h % 21) - 10); // [-10..10]
              const jy = (((h >>> 8) % 9) - 6); // [-6..2]

              const color =
                e.kind === 'heal'
                  ? 'text-green-300'
                  : e.kind === 'mp'
                    ? 'text-cyan-300'
                    : 'text-red-300';

              const outline: React.CSSProperties = {
                textShadow:
                  '1px 1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.55)',
              };

              return (
                <div
                  key={e.id}
                  className={`absolute z-30 font-extrabold text-[26px] ${color}`}
                  style={
                    {
                      left: anchorCx,
                      top: anchorCy,
                      // CSS variables consumed by keyframes
                      ['--jx' as any]: `${jx}px`,
                      ['--jy' as any]: `${jy}px`,
                      animation: 'combat-floater 700ms cubic-bezier(0.2, 1.2, 0.2, 1) forwards',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    } as React.CSSProperties
                  }
                >
                  {/* tiny splat */}
                  <div
                    className={
                      'absolute -z-10 left-1/2 top-1/2 w-9 h-7 ' +
                      (e.kind === 'heal'
                        ? 'bg-green-500/70'
                        : e.kind === 'mp'
                          ? 'bg-cyan-500/70'
                          : 'bg-red-500/70')
                    }
                    style={
                      {
                        borderRadius: '55% 45% 60% 40% / 55% 40% 60% 45%',
                        filter: 'blur(0.25px)',
                        animation: 'combat-splat 700ms ease-out forwards',
                        ['--jx' as any]: `${jx}px`,
                        ['--jy' as any]: `${jy}px`,
                        transform: 'translate(-50%, -50%)',
                      } as React.CSSProperties
                    }
                  />

                  <span className="mr-1" style={outline}>{e.icon}</span>
                  <span style={outline}>{e.amount}</span>
                </div>
              );
            })}

            {/* Player */}
            <div
              className="absolute text-cyan-400 font-bold text-2xl flex items-center justify-center transition-transform"
              style={{
                left: player.pos.x * TILE_SIZE,
                top: player.pos.y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                transition: 'left 180ms ease-out, top 180ms ease-out',
                transform: animating && interaction && (interaction.type === 'attack' || interaction.type === 'enemy-aggro' || interaction.type === 'enemy-attack')
                  ? `translate(${(interaction.targetPos.x - player.pos.x) * 8}px, ${(interaction.targetPos.y - player.pos.y) * 8}px)`
                  : 'translate(0, 0)'
              }}
              title="Player"
            >
              {lastMoveDirection?.y === -1 ? '↑' : lastMoveDirection?.y === 1 ? '↓' : lastMoveDirection?.x === -1 ? '←' : lastMoveDirection?.x === 1 ? '→' : '●'}
            </div>

            {/* Enemies and items */}
            {floor.entities.map((e) => {
              if (e.kind === 'enemy') {
                const data = e.data as EnemyData;
                const showAggro =
                  interaction?.type === 'enemy-aggro' &&
                  (interaction.aggroEnemyIds?.includes(e.id) ?? false);
                const isAttacking = interaction?.type === 'enemy-attack' && interaction.attackerId === e.id;
                const attackDx = player.pos.x - e.pos.x;
                const attackDy = player.pos.y - e.pos.y;
                const attackElapsed = isAttacking ? Date.now() - (interaction?.timestamp ?? 0) : 0;
                return (
                  <div
                    key={e.id}
                    className="absolute text-red-400 text-2xl flex items-center justify-center"
                    style={{
                      left: e.pos.x * TILE_SIZE,
                      top: e.pos.y * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      transition: 'left 180ms ease-out, top 180ms ease-out, transform 80ms cubic-bezier(0.22, 1, 0.36, 1)',
                      transform: isAttacking && attackElapsed < 90 ? `translate(${attackDx * 14}px, ${attackDy * 14}px)` : 'translate(0, 0)'
                    }}
                    title={`Enemy (${e.pos.x}, ${e.pos.y})`}
                    onMouseEnter={(event) => {
                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      setHoveredEnemy({
                        enemy: data,
                        position: {
                          x: rect.left - 10,
                          y: rect.top,
                        },
                      });
                      // Ensure we don't show two tooltips at once.
                      setHoveredItem(null);
                    }}
                    onMouseLeave={() => setHoveredEnemy(null)}
                  >
                    {/* Health bar when damaged */}
                    {data && data.hp < data.maxHp && (
                      <div className="absolute -top-3 left-0 right-0 h-1 bg-gray-700 rounded-full overflow-hidden" style={{ width: TILE_SIZE }}>
                        <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100))}%` }} />
                      </div>
                    )}
                    {/* Aggro cue */}
                    {showAggro && (
                      <div className="absolute -top-6 left-0 right-0 flex justify-center">
                        <span className="text-yellow-300 animate-pulse enemy-jump" style={{ display: 'inline-block' }}>!</span>
                      </div>
                    )}
                    ⚔
                  </div>
                );
              }
              if (e.kind === 'item') {
                const data = e.data as Record<string, unknown>;
                const embeddedItem = data?.item as InventoryItem | undefined;
                const itemId = data?.itemId as string | undefined;
                const itemDef = embeddedItem || (itemId ? getItemById(itemId) : undefined);

                return (
                  <div
                    key={e.id}
                    className="absolute text-purple-400 text-2xl flex items-center justify-center"
                    style={{
                      left: e.pos.x * TILE_SIZE,
                      top: e.pos.y * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      transition: 'left 180ms ease-out, top 180ms ease-out',
                    }}
                    title={`Item (${e.pos.x}, ${e.pos.y})`}
                    onMouseEnter={(event) => {
                      if (!itemDef) {
                        setHoveredItem(null);
                        return;
                      }

                      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                      setHoveredItem({
                        item: itemDef,
                        position: {
                          x: rect.left - 10,
                          y: rect.top,
                        },
                      });
                      // Ensure we don't show two tooltips at once.
                      setHoveredEnemy(null);
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {itemDef?.icon || '◆'}
                  </div>
                );
              }
              if (e.kind === 'npc') {
                const data = e.data as Record<string, unknown>;
                const npcType = data?.npcType as string | undefined;
                
                // Determine NPC icon based on type
                const npcIcon = npcType === 'shopkeeper' ? '🏪' : '👤';
                
                return (
                  <div
                    key={e.id}
                    className="absolute text-yellow-400 text-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: e.pos.x * TILE_SIZE,
                      top: e.pos.y * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                    }}
                    title={`Shopkeeper (${e.pos.x}, ${e.pos.y})`}
                  >
                    {npcIcon}
                  </div>
                );
              }
              return null;
            })}
          </div>
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
      </div>

      {/* Inventory Panel */}
      <InventoryPanel />

      {/* Shop Panel */}
      {shopOpen && (
        <ShopPanel
          shopInventory={shopInventory}
          selectedSlot={selectedShopSlot}
          onItemClick={buyShopItem}
          onItemHover={(item, idx) => {
            if (item) {
              const rect = document.querySelector(`[data-shop-slot="${idx}"]`)?.getBoundingClientRect();
              if (rect) {
                setHoveredItem({
                  item,
                  position: { x: rect.right + 10, y: rect.top + rect.height / 2 },
                });
              }
            } else {
              setHoveredItem(null);
            }
          }}
        />
      )}

      {/* Tooltip - appears on hover */}
      {hoveredItem && (
        <ItemTooltip 
          item={hoveredItem.item} 
          position={hoveredItem.position} 
          effectiveStats={effectiveStats}
          alignment={shopOpen ? 'right' : 'left'}
        />
      )}

      {hoveredEnemy && (
        <EnemyTooltip enemy={hoveredEnemy.enemy} position={hoveredEnemy.position} />
      )}
    </div>
  );
}
