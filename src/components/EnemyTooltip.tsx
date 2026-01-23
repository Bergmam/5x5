import type { EnemyData } from '../game/types';
import { getEnemyType } from '../game/enemyTypes';

interface EnemyTooltipProps {
  enemy: EnemyData;
  position: { x: number; y: number };
}

export default function EnemyTooltip({ enemy, position }: EnemyTooltipProps) {
  const mode = enemy.state?.mode ?? enemy.ai ?? 'unknown';
  const enemyType = enemy.typeId ? getEnemyType(enemy.typeId) : null;

  return (
    <div
      className="fixed z-50 bg-gray-900 border-2 border-gray-600 rounded p-3 min-w-56 shadow-lg pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-100%)',
      }}
    >
      {/* Header with icon and name */}
      <div className="flex items-center gap-2">
        {enemyType && <span className="text-2xl">{enemyType.icon}</span>}
        <span className="text-gray-100 font-bold">{enemyType?.name || 'Enemy'}</span>
      </div>
      
      {enemyType && (
        <div className="text-xs text-gray-400 mt-1">{enemyType.description}</div>
      )}
      
      <div className="border-t border-gray-700 my-2" />

      {/* Stats */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-red-400">HP</span>
          <span className="text-gray-100 tabular-nums font-semibold">
            {enemy.hp}/{enemy.maxHp}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Damage</span>
          <span className="text-gray-100 tabular-nums">{enemy.damage}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Armor</span>
          <span className="text-gray-100 tabular-nums">{enemy.armor}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Level</span>
          <span className="text-gray-100 tabular-nums">{enemy.level}</span>
        </div>
      </div>

      {/* Abilities */}
      {enemyType?.abilities && enemyType.abilities.length > 0 && (
        <>
          <div className="border-t border-gray-700 my-2" />
          <div className="text-sm">
            <div className="text-purple-300 font-semibold mb-1">Abilities:</div>
            {enemyType.abilities.map((ability) => (
              <div key={ability.id} className="text-xs text-gray-300 flex items-center gap-1">
                <span>{ability.icon}</span>
                <span>{ability.name}</span>
                <span className="text-gray-500">(Every {ability.turnInterval} turns)</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Behavior info */}
      {enemyType && (
        <>
          <div className="border-t border-gray-700 my-2" />
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Movement:</span>
              <span className="text-gray-300">{enemyType.movementPattern}</span>
            </div>
            <div className="flex justify-between">
              <span>Attack:</span>
              <span className="text-gray-300">{enemyType.attackPattern} (Range: {enemyType.attackRange})</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

