import { MapFloor, EnemyData } from './types';

export interface EnemyAIPayload {
  floor: MapFloor;
  playerPos: { x: number; y: number };
}

export interface EnemyAIResult {
  floor: MapFloor;
  interaction?: {
    type: 'attack' | 'bump' | 'enemy-aggro' | 'enemy-attack';
    targetPos: { x: number; y: number };
    timestamp: number;
    attackerId?: string;
    aggroEnemyIds?: string[];
  } | null;
  attacks?: Array<{ attackerId: string }>;
}

export function runEnemyTurn(payload: EnemyAIPayload): EnemyAIResult {
  const { floor, playerPos } = payload;
  // Track occupancy as we move enemies sequentially to avoid stacking
  const toKey = (p: {x:number;y:number}) => `${p.x},${p.y}`;
  const occupiedNext = new Set<string>(floor.entities.map(en => toKey(en.pos)));
  const attacks: Array<{ attackerId: string }> = [];

  // Track last-turn positions for distance/aggro decisions.
  // This enables behavior like: an enemy steps into distance 2 during its move and immediately aggros.
  const prevPosById = new Map<string, { x: number; y: number }>();
  for (const prev of floor.entities) {
    prevPosById.set(prev.id, { ...prev.pos });
  }

  const entities = floor.entities.map((e, idx) => {
    if (e.kind !== 'enemy') return e;
    const data = e.data as EnemyData;
    if (!data) return e;

    // Aggro distance is evaluated from the enemy's position at the start of this enemy turn.
    // (Movement happens later in this function.)
    const startPos = prevPosById.get(e.id) ?? e.pos;
    const dist = Math.abs(startPos.x - playerPos.x) + Math.abs(startPos.y - playerPos.y);
    const tookDamage = data.state?.lastHp !== undefined && data.hp < (data.state?.lastHp ?? data.hp);
    // Follow is sticky: once an enemy enters follow, it stays in follow for the rest of the floor.
    const prevMode: 'static' | 'patrol' | 'follow' = (data.state?.mode ?? data.ai ?? 'static');
    const newMode: 'static' | 'patrol' | 'follow' =
      prevMode === 'follow'
        ? 'follow'
        : (dist <= 2 || tookDamage)
          ? 'follow'
          : prevMode;

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
        // Adjacent: perform melee attack instead of moving
        attacks.push({ attackerId: e.id });
        // stay put; animation will be handled by store/UI via interaction
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

  // Build a lookup by id to avoid index-based mismatches when entities are added/removed
  const prevById = new Map<string, EnemyData>();
  for (const prev of floor.entities) {
    if (prev.kind !== 'enemy') continue;
    prevById.set(prev.id, prev.data as EnemyData);
  }

  let aggroEnemyIds = entities
    .filter((e): e is typeof e & { kind: 'enemy' } => e.kind === 'enemy')
    .filter((e) => {
      const prevData = prevById.get(e.id);
      const prevMode = prevData?.state?.mode ?? prevData?.ai;
      const currMode = (e.data as EnemyData)?.state?.mode;
      return prevMode !== 'follow' && currMode === 'follow';
    })
    .map((e) => e.id);

  // Post-move proximity rule:
  // After enemies have moved, any enemy that ends within distance <= 2 transitions into follow
  // immediately (sticky), and we emit enemy-aggro once for that transition.
  // This matches the in-game expectation: if an enemy steps into range this turn, it aggros now.
  const proximityAggroIds: string[] = [];
  for (const e of entities) {
    if (e.kind !== 'enemy') continue;
    const data = e.data as EnemyData;
    const prevData = prevById.get(e.id);
    const prevMode = prevData?.state?.mode ?? prevData?.ai;
    const currMode = data?.state?.mode;

    if (prevMode === 'follow') continue; // already following; sticky
    if (currMode === 'follow') continue; // already transitioned via start-of-turn distance/damage

    const distAfterMove = Math.abs(e.pos.x - playerPos.x) + Math.abs(e.pos.y - playerPos.y);
    if (distAfterMove <= 2) {
      data.state = { ...(data.state || {}), mode: 'follow', lastHp: data.hp };
      proximityAggroIds.push(e.id);
    }
  }

  if (proximityAggroIds.length > 0) {
    aggroEnemyIds = aggroEnemyIds.concat(proximityAggroIds);
  }

  const uniqueAggroEnemyIds = Array.from(new Set(aggroEnemyIds));

  // Only emit a fresh interaction when something happens this turn
  let interaction: EnemyAIResult['interaction'] = null;
  if (uniqueAggroEnemyIds.length > 0) {
    interaction = { type: 'enemy-aggro', targetPos: playerPos, timestamp: Date.now() as number, aggroEnemyIds: uniqueAggroEnemyIds };
  } else if (attacks.length > 0) {
    // Emit enemy attack animation; store will apply damage from attackerIds
    interaction = { type: 'enemy-attack', targetPos: playerPos, timestamp: Date.now() as number, attackerId: attacks[0].attackerId };
  }

  return {
    floor: { ...floor, entities },
    interaction,
    attacks,
  };
}
