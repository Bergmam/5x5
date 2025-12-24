import type { EnemyData } from '../game/types';

interface EnemyTooltipProps {
  enemy: EnemyData;
  position: { x: number; y: number };
}

export default function EnemyTooltip({ enemy, position }: EnemyTooltipProps) {
  const mode = enemy.state?.mode ?? enemy.ai ?? 'unknown';

  return (
    <div
      className="fixed z-50 bg-gray-900 border-2 border-gray-600 rounded p-3 min-w-56 shadow-lg pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-100%)',
      }}
    >
      <div className="text-gray-100 font-bold">Enemy</div>
      <div className="border-t border-gray-700 my-2" />

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
      </div>
    </div>
  );
}
