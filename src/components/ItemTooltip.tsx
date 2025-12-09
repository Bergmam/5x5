import type { InventoryItem } from '../game/types';

interface ItemTooltipProps {
  item: InventoryItem;
  position: { x: number; y: number };
}

export default function ItemTooltip({ item, position }: ItemTooltipProps) {
  const rarityText = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
  
  // Format stats for display
  const stats: string[] = [];
  if (item.stats) {
    if (item.stats.hpBonus) stats.push(`+${item.stats.hpBonus} Max HP`);
    if (item.stats.mpBonus) stats.push(`+${item.stats.mpBonus} Max MP`);
    if (item.stats.armorBonus) stats.push(`+${item.stats.armorBonus} Armor`);
    if (item.stats.weaponDamageBonus) stats.push(`+${item.stats.weaponDamageBonus} Weapon Damage`);
    if (item.stats.spellDamageBonus) stats.push(`+${item.stats.spellDamageBonus} Spell Damage`);
  }
  
  // Format consumable effects
  const effects: string[] = [];
  if (item.consumable) {
    if (item.consumable.healHp) effects.push(`Restores ${item.consumable.healHp} HP`);
    if (item.consumable.restoreMp) effects.push(`Restores ${item.consumable.restoreMp} MP`);
  }
  
  return (
    <div
      className="fixed z-50 bg-gray-900 border-2 border-gray-600 rounded p-3 min-w-64 shadow-lg pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-100%)',
      }}
    >
      <div className="text-gray-100 font-bold">
        {item.name} <span className="text-gray-400 font-normal">({rarityText})</span>
      </div>
      
      <div className="border-t border-gray-700 my-2" />
      
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
      
      <div className="text-gray-400 text-sm italic">
        "{item.description}"
      </div>
    </div>
  );
}
