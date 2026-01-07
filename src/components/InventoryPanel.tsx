import { useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getInventoryCount } from '../game/inventory';
import { calculateEffectiveStats } from '../game/stats';
import InventorySlot from './InventorySlot';
import ItemTooltip from './ItemTooltip';
import type { InventoryItem } from '../game/types';

export default function InventoryPanel() {
  const {
    player,
    inventoryOpen,
    selectedItemSlot,
    toggleInventory,
    selectItem,
    useItem,
    destroyItem,
    sellItem,
    shopOpen,
  } = useGameStore();

  const [hoveredItem, setHoveredItem] = useState<{
    item: InventoryItem;
    position: { x: number; y: number };
  } | null>(null);

  const [selectedItemPopup, setSelectedItemPopup] = useState<{
    item: InventoryItem;
    slotIndex: number;
    position: { x: number; y: number };
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  if (!inventoryOpen) return null;

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

  const canUse = selectedItemPopup?.item.kind === 'consumable';

  const handleSlotHover = (item: InventoryItem | null, index: number, event: React.MouseEvent) => {
    // Don't show tooltip if we have an action popup open
    if (selectedItemPopup) {
      setHoveredItem(null);
      return;
    }

    if (!item) {
      setHoveredItem(null);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredItem({
      item,
      position: {
        x: rect.left - 10,
        y: rect.top,
      },
    });
  };

  const handleSlotClick = (item: InventoryItem | null, index: number, event: React.MouseEvent) => {
    // Clear hover tooltip when clicking
    setHoveredItem(null);

    if (!item) {
      setSelectedItemPopup(null);
      selectItem(null);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    // If clicking the same item, deselect
    if (selectedItemSlot === index) {
      setSelectedItemPopup(null);
      selectItem(null);
    } else {
      setSelectedItemPopup({
        item,
        slotIndex: index,
        position: {
          x: rect.left - 10,
          y: rect.bottom + 5,
        },
      });
      selectItem(index);
    }
  };

  const handleUseItem = () => {
    if (selectedItemPopup && canUse) {
      useItem(selectedItemPopup.slotIndex);
      setSelectedItemPopup(null);
    }
  };

  const handleDestroyItem = () => {
    if (selectedItemPopup) {
      if (shopOpen) {
        // Sell the item when shop is open
        sellItem(selectedItemPopup.slotIndex);
      } else {
        // Destroy the item normally
        destroyItem(selectedItemPopup.slotIndex);
      }
      setSelectedItemPopup(null);
    }
  };

  return (
    <>
      <div
        ref={panelRef}
        className="fixed right-4 top-1/2 -translate-y-1/2 bg-gray-900 border-2 border-cyan-500 rounded p-4 shadow-xl z-40"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-cyan-400 font-bold text-xl">
            {shopOpen ? 'Your Inventory' : `Inventory (${getInventoryCount(player.inventory)}/25)`}
          </div>
          {!shopOpen && (
            <button
              onClick={toggleInventory}
              className="text-gray-400 hover:text-gray-100 text-xl font-bold"
              aria-label="Close inventory"
            >
              ×
            </button>
          )}
        </div>

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-1">
          {player.inventory.map((item, index) => (
            <InventorySlot
              key={index}
              item={item}
              isSelected={selectedItemSlot === index}
              onSelect={(e: React.MouseEvent<HTMLButtonElement>) => handleSlotClick(item, index, e)}
              onHover={(e) => handleSlotHover(item, index, e)}
              onHoverEnd={() => setHoveredItem(null)}
            />
          ))}
        </div>

        {/* Shop hint */}
        {shopOpen && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-yellow-400 text-sm text-center">
              Click items to sell them to the shop
            </div>
            <div className="text-gray-500 text-xs text-center mt-1">
              Press ESC to close
            </div>
          </div>
        )}
      </div>

      {/* Tooltip - appears on hover (outside panel) */}
      {hoveredItem && !selectedItemPopup && (
        <ItemTooltip item={hoveredItem.item} position={hoveredItem.position} effectiveStats={effectiveStats} />
      )}

      {/* Action Popup - appears on click (outside panel) */}
      {selectedItemPopup && (
        <div
          className="fixed bg-gray-900 border-2 border-cyan-500 rounded p-3 shadow-xl z-50"
          style={{
            left: `${selectedItemPopup.position.x}px`,
            top: `${selectedItemPopup.position.y}px`,
            transform: 'translateX(-100%)',
          }}
        >
          <div className="text-gray-100 font-semibold text-sm mb-2">
            {selectedItemPopup.item.name}
          </div>
          <div className="flex gap-2">
            {canUse && !shopOpen && (
              <button
                onClick={handleUseItem}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                Use
              </button>
            )}
            <button
              onClick={handleDestroyItem}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              {shopOpen ? 'Sell' : 'Destroy'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
