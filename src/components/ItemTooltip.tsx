import type { InventoryItem } from '../game/types';
import { PLAYER_STAT_LABELS, PLAYER_STAT_ORDER, type PlayerStats } from '../game/stats';
import { getAbilityById, type AbilityId } from '../game/abilities';

interface ItemTooltipProps {
  item: InventoryItem;
  position: { x: number; y: number };
  effectiveStats?: PlayerStats;
  alignment?: 'left' | 'right'; // 'left' means tooltip appears to the left, 'right' means to the right
}

export default function ItemTooltip({ item, position, effectiveStats, alignment = 'left' }: ItemTooltipProps) {
  const rarityText = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
  
  // Format stats for display
  const stats: string[] = [];
  if (item.stats) {
    for (const key of PLAYER_STAT_ORDER) {
      const v = item.stats[key];
      if (typeof v === 'number' && v !== 0) {
        stats.push(`+${v} ${PLAYER_STAT_LABELS[key]}`);
      }
    }
  }
  
  // Format consumable effects
  const effects: string[] = [];
  if (item.consumable) {
    if (item.consumable.healHp) effects.push(`Restores ${item.consumable.healHp} HP`);
    if (item.consumable.restoreMp) effects.push(`Restores ${item.consumable.restoreMp} MP`);
  }
  
  // For ability-granting items, show ability details with damage
  let abilityInfo: { name: string; description: string; mpCost: number; damage?: number } | null = null;
  if (item.kind === 'ability-granting' && item.abilityId && effectiveStats) {
    const ability = getAbilityById(item.abilityId as AbilityId);
    if (ability) {
      // Calculate damage (base 5 + spellDamage, same formula as in abilities.ts)
      const totalDamage = Math.max(5, effectiveStats.spellDamage);
      abilityInfo = {
        name: ability.name,
        description: ability.description,
        mpCost: ability.mpCost || 0,
        damage: totalDamage,
      };
    }
  }
  
  return (
    <div
      className="fixed z-50 bg-gray-900 border-2 border-gray-600 rounded p-3 min-w-64 shadow-lg pointer-events-none"
      style={{
        left: alignment === 'right' ? `${position.x}px` : undefined,
        right: alignment === 'left' ? `${window.innerWidth - position.x}px` : undefined,
        top: `${position.y}px`,
        transform: alignment === 'right' ? 'translateX(0)' : 'translateX(0)',
      }}
    >
      <div className="text-gray-100 font-bold">
        {item.name} <span className="text-gray-400 font-normal">({rarityText})</span>
      </div>
      
      <div className="border-t border-gray-700 my-2" />
      
      {abilityInfo && (
        <>
          <div className="text-purple-400 text-sm mb-1 font-semibold">
            {abilityInfo.name}
          </div>
          <div className="text-purple-300 text-sm mb-1">
            Damage: {abilityInfo.damage} | MP Cost: {abilityInfo.mpCost}
          </div>
          <div className="text-gray-300 text-sm mb-2">
            {abilityInfo.description}
          </div>
          <div className="border-t border-gray-700 my-2" />
        </>
      )}
      
      {effects.length > 0 && (
        <div className="text-green-400 text-sm mb-2">
          {effects.map((effect, i) => (
            <div key={i}>{effect}</div>
          ))}
        </div>
      )}
      
      {stats.length > 0 && (
        <div className="text-blue-400 text-sm mb-2">
          {stats.map((stat, i) => (
            <div key={i}>{stat}</div>
          ))}
        </div>
      )}
      
      <div className="text-gray-400 text-sm italic mb-2">
        "{item.description}"
      </div>
      
      <div className="border-t border-gray-700 my-2" />
      
      <div className="text-yellow-400 text-sm">
        Value: {item.saleValue} gold
      </div>
    </div>
  );
}
