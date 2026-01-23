import { MapFloor, EnemyData, Vec2, EntityBase } from './types';
import { getEnemyType } from './enemyTypes';
import type { EnemyTypeDefinition, EnemyAbilityResult } from './enemyTypes';

export interface EnemyAIPayload {
  floor: MapFloor;
  playerPos: { x: number; y: number };
  turnCount?: number; // NEW: Track turn count for abilities and slow enemies
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
  abilityResults?: Array<EnemyAbilityResult & { enemyId: string }>; // NEW: Track ability executions
}

// Helper: Calculate Manhattan distance
function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Helper: Check if position is in bounds and walkable
function isValidPosition(pos: Vec2, floor: MapFloor, occupied: Set<string>, playerPos: Vec2): boolean {
  const toKey = (p: Vec2) => `${p.x},${p.y}`;
  
  if (pos.x < 0 || pos.x >= floor.width || pos.y < 0 || pos.y >= floor.height) {
    return false;
  }
  
  if (pos.x === playerPos.x && pos.y === playerPos.y) {
    return false;
  }
  
  const tile = floor.tiles[pos.y * floor.width + pos.x];
  if (!tile || !tile.walkable) {
    return false;
  }
  
  if (occupied.has(toKey(pos))) {
    return false;
  }
  
  return true;
}

// Helper: Check if enemy should move this turn (for slow enemies)
function shouldMoveThisTurn(data: EnemyData, type: EnemyTypeDefinition, turnCount: number): boolean {
  if (type.moveSpeed >= 1) return true;
  if (type.moveSpeed === 0) return false;
  
  const lastMove = data.state?.lastMoveTurn ?? 0;
  const turnsPerMove = Math.ceil(1 / type.moveSpeed);
  
  return (turnCount - lastMove) >= turnsPerMove;
}

// Calculate patrol movement
function calculatePatrolMove(
  enemy: EntityBase,
  data: EnemyData,
  floor: MapFloor,
  occupied: Set<string>,
  playerPos: Vec2
): Vec2 {
  if (!data.spawnPos) return enemy.pos;
  
  const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  
  for (const d of dirs) {
    const candidate = { x: enemy.pos.x + d.x, y: enemy.pos.y + d.y };
    const within = manhattan(candidate, data.spawnPos) <= 2;
    
    if (within && isValidPosition(candidate, floor, occupied, playerPos)) {
      return candidate;
    }
  }
  
  return enemy.pos;
}

// Calculate chase movement (current "follow" behavior)
function calculateChaseMove(
  enemy: EntityBase,
  data: EnemyData,
  floor: MapFloor,
  occupied: Set<string>,
  playerPos: Vec2
): Vec2 {
  const dx = Math.sign(playerPos.x - enemy.pos.x);
  const dy = Math.sign(playerPos.y - enemy.pos.y);
  const primary = Math.abs(playerPos.x - enemy.pos.x) >= Math.abs(playerPos.y - enemy.pos.y)
    ? { x: dx, y: 0 }
    : { x: 0, y: dy };
  const secondary = primary.x !== 0 ? { x: 0, y: dy } : { x: dx, y: 0 };
  const trySteps = [primary, secondary];
  
  for (const step of trySteps) {
    const cand = { x: enemy.pos.x + step.x, y: enemy.pos.y + step.y };
    if (isValidPosition(cand, floor, occupied, playerPos)) {
      return cand;
    }
  }
  
  return enemy.pos;
}

// Calculate maintain-distance movement (for archers, mages)
function calculateMaintainDistanceMove(
  enemy: EntityBase,
  data: EnemyData,
  preferredDistance: number,
  floor: MapFloor,
  occupied: Set<string>,
  playerPos: Vec2
): Vec2 {
  const currentDist = manhattan(enemy.pos, playerPos);
  
  // If at or near preferred distance, try to maintain it
  if (Math.abs(currentDist - preferredDistance) <= 1) {
    // Try to stay still or move perpendicular to player
    const dx = playerPos.x - enemy.pos.x;
    const dy = playerPos.y - enemy.pos.y;
    const perpendiculars = [
      { x: dy !== 0 ? 1 : 0, y: dx !== 0 ? 1 : 0 },
      { x: dy !== 0 ? -1 : 0, y: dx !== 0 ? -1 : 0 },
    ];
    
    for (const step of perpendiculars) {
      const cand = { x: enemy.pos.x + step.x, y: enemy.pos.y + step.y };
      if (isValidPosition(cand, floor, occupied, playerPos)) {
        const newDist = manhattan(cand, playerPos);
        if (Math.abs(newDist - preferredDistance) <= 1) {
          return cand;
        }
      }
    }
    
    return enemy.pos;
  }
  
  // If too close, back away
  if (currentDist < preferredDistance) {
    const dx = Math.sign(enemy.pos.x - playerPos.x);
    const dy = Math.sign(enemy.pos.y - playerPos.y);
    const awaySteps = [
      { x: dx, y: 0 },
      { x: 0, y: dy },
      { x: dx, y: dy },
    ];
    
    for (const step of awaySteps) {
      const cand = { x: enemy.pos.x + step.x, y: enemy.pos.y + step.y };
      if (isValidPosition(cand, floor, occupied, playerPos)) {
        return cand;
      }
    }
  }
  
  // If too far, move closer (but not too close)
  if (currentDist > preferredDistance + 1) {
    return calculateChaseMove(enemy, data, floor, occupied, playerPos);
  }
  
  return enemy.pos;
}

// Calculate teleport movement (for ghosts)
function calculateTeleportMove(
  enemy: EntityBase,
  data: EnemyData,
  floor: MapFloor,
  occupied: Set<string>,
  playerPos: Vec2
): Vec2 {
  const currentDist = manhattan(enemy.pos, playerPos);
  
  // Only teleport if far from player
  if (currentDist <= 3) {
    // Use normal chase if close
    return calculateChaseMove(enemy, data, floor, occupied, playerPos);
  }
  
  // Find positions 2-4 tiles away from player
  const candidates: Vec2[] = [];
  const minDist = 2;
  const maxDist = 4;
  
  for (let dx = -maxDist; dx <= maxDist; dx++) {
    for (let dy = -maxDist; dy <= maxDist; dy++) {
      const pos = { x: playerPos.x + dx, y: playerPos.y + dy };
      const dist = manhattan(pos, playerPos);
      
      if (dist >= minDist && dist <= maxDist) {
        if (isValidPosition(pos, floor, occupied, playerPos)) {
          candidates.push(pos);
        }
      }
    }
  }
  
  if (candidates.length > 0) {
    // Pick a random candidate
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  
  // Fallback to chase if no valid teleport positions
  return calculateChaseMove(enemy, data, floor, occupied, playerPos);
}

// Calculate movement based on enemy type's movement pattern
function calculateMovement(
  enemy: EntityBase,
  data: EnemyData,
  type: EnemyTypeDefinition,
  behaviorMode: 'static' | 'patrol' | 'follow',
  floor: MapFloor,
  occupied: Set<string>,
  playerPos: Vec2
): Vec2 {
  // Static enemies never move
  if (type.movementPattern === 'static') {
    return enemy.pos;
  }
  
  // If not yet aggroed, use type's default pattern
  if (behaviorMode === 'static') {
    return enemy.pos;
  }
  
  if (behaviorMode === 'patrol') {
    return calculatePatrolMove(enemy, data, floor, occupied, playerPos);
  }
  
  // If aggroed (follow mode), use type-specific movement
  switch (type.movementPattern) {
    case 'patrol':
    case 'chase':
      return calculateChaseMove(enemy, data, floor, occupied, playerPos);
      
    case 'maintain-distance':
      // Use preferred distance based on attack range
      const preferredDist = Math.max(2, type.attackRange - 1);
      return calculateMaintainDistanceMove(enemy, data, preferredDist, floor, occupied, playerPos);
      
    case 'teleport':
      return calculateTeleportMove(enemy, data, floor, occupied, playerPos);
      
    default:
      return enemy.pos;
  }
}

export function runEnemyTurn(payload: EnemyAIPayload): EnemyAIResult {
  const { floor, playerPos, turnCount = 0 } = payload;
  
  // Track occupancy as we move enemies sequentially to avoid stacking
  const toKey = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const occupiedNext = new Set<string>(floor.entities.map(en => toKey(en.pos)));
  const attacks: Array<{ attackerId: string }> = [];

  // Track last-turn positions for distance/aggro decisions
  const prevPosById = new Map<string, { x: number; y: number }>();
  for (const prev of floor.entities) {
    prevPosById.set(prev.id, { ...prev.pos });
  }

  const entities = floor.entities.map((e) => {
    if (e.kind !== 'enemy') return e;
    const data = e.data as EnemyData;
    if (!data) return e;

    // Get enemy type (fallback to goblin if not set for backward compatibility)
    const type = data.typeId ? getEnemyType(data.typeId) : getEnemyType('goblin');
    
    // Determine aggro based on enemy type's aggro range
    const startPos = prevPosById.get(e.id) ?? e.pos;
    const dist = manhattan(startPos, playerPos);
    const tookDamage = data.state?.lastHp !== undefined && data.hp < (data.state?.lastHp ?? data.hp);
    
    // Use enemy type's aggro range
    const aggroRange = type.aggroRange;
    
    // Follow is sticky: once an enemy enters follow, it stays in follow
    const prevMode: 'static' | 'patrol' | 'follow' = (data.state?.mode ?? data.ai ?? 'static');
    const newMode: 'static' | 'patrol' | 'follow' =
      prevMode === 'follow'
        ? 'follow'
        : (dist <= aggroRange || tookDamage)
          ? 'follow'
          : prevMode;

    let nextPos = { ...e.pos };
    occupiedNext.delete(toKey(e.pos));

    // Check if enemy can already attack from current position
    const distFromCurrent = manhattan(e.pos, playerPos);
    const canAttackFromCurrent = distFromCurrent <= type.attackRange && newMode === 'follow';
    
    // Ranged enemies don't move if they can already attack
    // Melee enemies need to be adjacent (distance 1) to attack
    const shouldMove = newMode !== 'static' && 
                      shouldMoveThisTurn(data, type, turnCount) &&
                      !(type.attackPattern === 'ranged' && canAttackFromCurrent);
    
    let didMove = false;
    if (shouldMove) {
      // Calculate movement based on enemy type and mode
      nextPos = calculateMovement(e, data, type, newMode, floor, occupiedNext, playerPos);
      didMove = nextPos.x !== e.pos.x || nextPos.y !== e.pos.y;
    }

    // Check if enemy can attack (from their final position)
    const distToPlayer = manhattan(nextPos, playerPos);
    const canAttack = distToPlayer <= type.attackRange;
    
    // CRITICAL: Ranged enemies CANNOT move and attack on the same turn
    // Melee enemies can move and attack (they need to move adjacent to attack)
    const canAttackThisTurn = canAttack && newMode === 'follow' && 
                              !(type.attackPattern === 'ranged' && didMove);
    
    if (canAttackThisTurn) {
      // Melee enemies only attack when adjacent
      if (type.attackPattern === 'melee' && distToPlayer === 1) {
        attacks.push({ attackerId: e.id });
      }
      // Ranged enemies can attack from their range (but only if they didn't move)
      else if (type.attackPattern === 'ranged' && distToPlayer <= type.attackRange) {
        attacks.push({ attackerId: e.id });
      }
    }

    // Update state
    const nextState = {
      ...(data.state || {}),
      mode: newMode,
      lastHp: data.hp,
      lastMoveTurn: shouldMove ? turnCount : (data.state?.lastMoveTurn ?? 0),
      abilities: data.state?.abilities || {},
    };

    // Reserve the decided next position
    occupiedNext.add(toKey(nextPos));
    
    return { ...e, pos: nextPos, data: { ...data, state: nextState } };
  });

  // Build a lookup by id to track mode changes
  const prevById = new Map<string, EnemyData>();
  for (const prev of floor.entities) {
    if (prev.kind !== 'enemy') continue;
    prevById.set(prev.id, prev.data as EnemyData);
  }

  // Track enemies that just aggroed
  let aggroEnemyIds = entities
    .filter((e): e is typeof e & { kind: 'enemy' } => e.kind === 'enemy')
    .filter((e) => {
      const prevData = prevById.get(e.id);
      const prevMode = prevData?.state?.mode ?? prevData?.ai;
      const currMode = (e.data as EnemyData)?.state?.mode;
      return prevMode !== 'follow' && currMode === 'follow';
    })
    .map((e) => e.id);

  // Post-move proximity check
  const proximityAggroIds: string[] = [];
  for (const e of entities) {
    if (e.kind !== 'enemy') continue;
    const data = e.data as EnemyData;
    const prevData = prevById.get(e.id);
    const prevMode = prevData?.state?.mode ?? prevData?.ai;
    const currMode = data?.state?.mode;

    if (prevMode === 'follow') continue;
    if (currMode === 'follow') continue;

    const type = data.typeId ? getEnemyType(data.typeId) : getEnemyType('goblin');
    const distAfterMove = manhattan(e.pos, playerPos);
    
    if (distAfterMove <= type.aggroRange) {
      data.state = { ...(data.state || {}), mode: 'follow', lastHp: data.hp };
      proximityAggroIds.push(e.id);
    }
  }

  if (proximityAggroIds.length > 0) {
    aggroEnemyIds = aggroEnemyIds.concat(proximityAggroIds);
  }

  const uniqueAggroEnemyIds = Array.from(new Set(aggroEnemyIds));

  // Process enemy abilities
  const abilityResults: Array<EnemyAbilityResult & { enemyId: string }> = [];
  
  for (const e of entities) {
    if (e.kind !== 'enemy') continue;
    const data = e.data as EnemyData;
    if (!data || !data.typeId) continue;
    
    const type = getEnemyType(data.typeId);
    
    // Only process abilities if enemy is aggroed
    const isAggroed = data.state?.mode === 'follow';
    if (!isAggroed || !type.abilities || type.abilities.length === 0) continue;
    
    // Check each ability
    for (const ability of type.abilities) {
      // Get last time this ability was used
      const lastUsed = data.state?.abilities?.[ability.id]?.lastUsedTurn;
      
      // If never used, treat as if it was last used at turn 0
      const effectiveLastUsed = lastUsed ?? 0;
      const turnsSinceLastUse = turnCount - effectiveLastUsed;
      
      // Check if ability should fire this turn
      if (turnsSinceLastUse >= ability.turnInterval) {
        // Execute ability
        const result = ability.execute({
          floor: { ...floor, entities },
          enemy: e,
          enemyData: data,
          playerPos,
          turnCount,
        });
        
        // Track ability usage - ensure state exists
        const currentMode = data.state?.mode || data.ai || 'patrol';
        data.state = {
          ...data.state,
          mode: currentMode,
          lastHp: data.state?.lastHp ?? data.hp,
          abilities: {
            ...(data.state?.abilities || {}),
            [ability.id]: { lastUsedTurn: turnCount },
          },
        };
        
        // Store result
        abilityResults.push({
          ...result,
          enemyId: e.id,
        });
      }
    }
  }

  // Emit interaction for aggro or attacks
  let interaction: EnemyAIResult['interaction'] = null;
  if (uniqueAggroEnemyIds.length > 0) {
    interaction = {
      type: 'enemy-aggro',
      targetPos: playerPos,
      timestamp: Date.now(),
      aggroEnemyIds: uniqueAggroEnemyIds,
    };
  } else if (attacks.length > 0) {
    interaction = {
      type: 'enemy-attack',
      targetPos: playerPos,
      timestamp: Date.now(),
      attackerId: attacks[0].attackerId,
    };
  }

  return {
    floor: { ...floor, entities },
    interaction,
    attacks,
    abilityResults: abilityResults.length > 0 ? abilityResults : undefined,
  };
}
