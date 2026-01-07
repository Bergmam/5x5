import type { InventoryItem } from '../game/types';

interface ShopPanelProps {
  shopInventory: (InventoryItem | null)[];
  onItemClick?: (slotIndex: number) => void;
  onItemHover?: (item: InventoryItem | null, slotIndex: number) => void;
  selectedSlot: number | null;
}

export default function ShopPanel({
  shopInventory,
  onItemClick,
  onItemHover,
  selectedSlot,
}: ShopPanelProps) {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-gray-900 border-2 border-yellow-600 rounded-lg shadow-2xl p-4 w-80">
      <div className="text-yellow-400 font-bold text-xl mb-3 text-center">
        Shop
      </div>
      
      <div className="border-t border-gray-700 mb-3" />
      
      {/* Shop grid (5x5 = 25 slots, same as inventory) */}
      <div className="grid grid-cols-5 gap-2">
        {shopInventory.map((item, idx) => (
          <button
            key={idx}
            data-shop-slot={idx}
            className={`
              w-12 h-12 border-2 rounded flex items-center justify-center
              text-2xl transition-all
              ${
                item
                  ? 'border-yellow-600 bg-yellow-900/20 hover:bg-yellow-900/40 cursor-pointer'
                  : 'border-gray-700 bg-gray-800/50 cursor-default'
              }
              ${selectedSlot === idx ? 'ring-2 ring-yellow-400' : ''}
            `}
            onClick={() => item && onItemClick?.(idx)}
            onMouseEnter={() => onItemHover?.(item, idx)}
            onMouseLeave={() => onItemHover?.(null, idx)}
            disabled={!item}
          >
            {item?.icon || ''}
          </button>
        ))}
      </div>
      
      <div className="border-t border-gray-700 mt-3 pt-3">
        <div className="text-gray-400 text-sm text-center">
          Click an item to purchase
        </div>
        <div className="text-gray-500 text-xs text-center mt-1">
          Press ESC to close
        </div>
      </div>
    </div>
  );
}
