import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getAbilityById, isDirectionalAbility } from '../game/abilities';
import { calculateEffectiveStats } from '../game/stats';

export default function AbilityBar() {
  const { abilityBar, castAbility, lastMoveDirection, gameOver, player } = useGameStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const effectiveStats = useMemo(() => {
    return calculateEffectiveStats(
      {
        maxHp: player.maxHp,
        maxMp: player.maxMp,
        armor: player.armor,
        weaponDamage: player.weaponDamage,
        spellDamage: player.spellDamage,
      },
      player.inventory
    );
  }, [player]);

  const hovered = useMemo(() => {
    if (hoveredIndex === null) return null;
    const id = abilityBar[hoveredIndex];
    if (!id) return null;
    return getAbilityById(id);
  }, [abilityBar, hoveredIndex]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex gap-2 bg-gray-950/70 border border-gray-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur">
        {abilityBar.map((id, idx) => {
          const def = id ? getAbilityById(id) : null;
          const directionalDisabled = !!def && isDirectionalAbility(def.id) && !lastMoveDirection;
          const mpCost = def?.mpCost ?? 0;
          const mpDisabled = !!def && mpCost > 0 && player.mp < mpCost;
          const disabled = gameOver || !def || directionalDisabled || mpDisabled;

          return (
            <button
              key={idx}
              className={
                'w-12 h-12 rounded border flex items-center justify-center text-2xl transition-colors ' +
                (def
                  ? disabled
                    ? 'border-gray-700 bg-gray-900 text-gray-500'
                    : 'border-cyan-500 bg-gray-900 text-gray-100 hover:bg-gray-800'
                  : 'border-gray-800 bg-gray-950 text-gray-800')
              }
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (disabled) return;
                castAbility(idx);
              }}
              aria-label={def ? def.name : 'Empty ability slot'}
            >
              {def ? def.icon : '·'}
            </button>
          );
        })}
      </div>

      {hovered && hoveredIndex !== null && (
        <div className="fixed z-50 bg-gray-900 border-2 border-gray-600 rounded p-3 min-w-64 shadow-lg pointer-events-none"
          style={{
            left: '50%',
            bottom: '5.5rem',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-gray-100 font-bold">{hovered.name}</div>
          <div className="border-t border-gray-700 my-2" />
          <div className="text-purple-300 text-sm mb-2">
            Damage: {Math.max(5, effectiveStats.spellDamage)} | MP Cost: {hovered.mpCost || 0}
          </div>
          <div className="text-gray-300 text-sm">{hovered.description}</div>
          {isDirectionalAbility(hovered.id) && !lastMoveDirection && (
            <div className="text-yellow-400 text-xs mt-2">Move once to set a facing direction.</div>
          )}
          {(hovered.mpCost ?? 0) > 0 && player.mp < (hovered.mpCost ?? 0) && (
            <div className="text-red-400 text-xs mt-1">Not enough MP.</div>
          )}
        </div>
      )}
    </div>
  );
}
