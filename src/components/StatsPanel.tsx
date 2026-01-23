import { PLAYER_STAT_LABELS, PLAYER_STAT_ORDER, type PlayerStats } from '../game/stats';

export default function StatsPanel({ stats }: { stats: PlayerStats }) {
  const visibleStats = PLAYER_STAT_ORDER.filter((k) => {
    // Hide maxHp and maxMp (they're shown elsewhere)
    if (k === 'maxHp' || k === 'maxMp') return false;
    // Hide hpPerFloor if it's 0 (no Vitality Charms)
    if (k === 'hpPerFloor' && stats[k] === 0) return false;
    return true;
  });
  
  return (
    <div className="w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4">
      <div className="text-gray-100 font-bold text-lg mb-3">Stats</div>
      <div className="space-y-2">
        {visibleStats.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{PLAYER_STAT_LABELS[k]}</span>
            <span className={`font-semibold tabular-nums ${k === 'hpPerFloor' ? 'text-green-400' : 'text-gray-100'}`}>
              {k === 'hpPerFloor' && stats[k] > 0 ? '+' : ''}{stats[k]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
