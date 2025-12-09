import type { InventoryItem } from '../game/types';

interface InventorySlotProps {
  item: InventoryItem | null;
  isSelected: boolean;
  onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onHover: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onHoverEnd: () => void;
}

const rarityColors = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
};

export default function InventorySlot({
  item,
  isSelected,
  onSelect,
  onHover,
  onHoverEnd,
}: InventorySlotProps) {
  return (
    <button
      className={`
        w-12 h-12 flex items-center justify-center
        bg-gray-800 border-2 rounded
        ${item ? rarityColors[item.rarity] : 'border-gray-700 border-dashed'}
        ${isSelected ? 'ring-2 ring-cyan-400' : ''}
        hover:bg-gray-700 transition-colors
        text-2xl
      `}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      {item?.icon || ''}
    </button>
  );
}
