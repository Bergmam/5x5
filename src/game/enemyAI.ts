import { MapFloor, EnemyData } from './types';

export interface EnemyAIPayload {
  floor: MapFloor;
  playerPos: { x: number; y: number };
  interaction?: {
    type: 'attack' | 'bump' | 'enemy-aggro';
    targetPos: { x: number; y: number };
    timestamp: number;
  } | null;
}

export interface EnemyAIResult {
  floor: MapFloor;
  interaction?: EnemyAIPayload['interaction'];
}

export function runEnemyTurn(payload: EnemyAIPayload): EnemyAIResult {
  const { floor, playerPos } = payload;
  // Track occupancy as we move enemies sequentially to avoid stacking
  const toKey = (p: {x:number;y:number}) => `${p.x},${p.y}`;
  const occupiedNext = new Set<string>(floor.entities.map(en => toKey(en.pos)));

  const entities = floor.entities.map((e, idx) => {
    if (e.kind !== 'enemy') return e;
    const data = e.data as EnemyData;
    if (!data) return e;

    const dist = Math.abs(e.pos.x - playerPos.x) + Math.abs(e.pos.y - playerPos.y);
    const tookDamage = data.state?.lastHp !== undefined && data.hp < (data.state?.lastHp ?? data.hp);
    const newMode: 'static' | 'patrol' | 'follow' = (dist <= 2 || tookDamage) ? 'follow' : (data.state?.mode ?? data.ai ?? 'static');

    const nextState = { ...(data.state || { mode: newMode }), lastHp: data.hp, mode: newMode };

    let nextPos = { ...e.pos };
    // Free up current position before deciding movement so others can move into it if needed
    occupiedNext.delete(toKey(e.pos));
    if (newMode === 'patrol' && data.spawnPos) {
      const dirs = [ {x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0} ];
      for (const d of dirs) {
        const candidate = { x: e.pos.x + d.x, y: e.pos.y + d.y };
        const within = Math.abs(candidate.x - data.spawnPos.x) + Math.abs(candidate.y - data.spawnPos.y) <= 2;
        const inBounds = candidate.x >= 0 && candidate.x < floor.width && candidate.y >= 0 && candidate.y < floor.height;
        if (!inBounds) continue;
        const tile = floor.tiles[candidate.y * floor.width + candidate.x];
        const occ = occupiedNext.has(toKey(candidate));
        if (within && tile && tile.walkable && !occ) { nextPos = candidate; break; }
      }
    } else if (newMode === 'follow') {
      const dx = Math.sign(playerPos.x - e.pos.x);
      const dy = Math.sign(playerPos.y - e.pos.y);
      const primary = Math.abs(playerPos.x - e.pos.x) >= Math.abs(playerPos.y - e.pos.y) ? {x:dx,y:0} : {x:0,y:dy};
      const secondary = primary.x !== 0 ? {x:0,y:dy} : {x:dx,y:0};
      const trySteps = [primary, secondary];

      const distToPlayer = Math.abs(playerPos.x - e.pos.x) + Math.abs(playerPos.y - e.pos.y);
      if (distToPlayer <= 1) {
        // stay put
      } else {
        for (const step of trySteps) {
          const cand = { x: e.pos.x + step.x, y: e.pos.y + step.y };
          const inBounds = cand.x >= 0 && cand.x < floor.width && cand.y >= 0 && cand.y < floor.height;
          if (!inBounds) continue;
          if (cand.x === playerPos.x && cand.y === playerPos.y) continue;
          const tile = floor.tiles[cand.y * floor.width + cand.x];
          const occ = occupiedNext.has(toKey(cand));
          if (tile && tile.walkable && !occ) { nextPos = cand; break; }
        }
      }
    }

    // Reserve the decided next position to prevent others from stepping onto it
    occupiedNext.add(toKey(nextPos));
    return { ...e, pos: nextPos, data: { ...data, state: nextState } };
  });

  const transitionedToFollow = entities.some((e, idx) => {
    if (e.kind !== 'enemy') return false;
    const prev = floor.entities[idx];
    const prevMode = (prev.data as EnemyData)?.state?.mode;
    const currMode = (e.data as EnemyData)?.state?.mode;
    return prevMode !== 'follow' && currMode === 'follow';
  });

  const interaction: EnemyAIPayload['interaction'] = transitionedToFollow
    ? { type: 'enemy-aggro', targetPos: playerPos, timestamp: Date.now() as number }
    : payload.interaction ?? null;

  return {
    floor: { ...floor, entities },
    interaction,
  };
}
