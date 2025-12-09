import { describe, it, expect } from 'vitest';
import { createRng } from '../src/game/rng';
import { generateFloor } from '../src/game/generator';
import { validateFloor } from '../src/game/validate';

describe('RNG determinism', () => {
  it('produces same sequence for same seed', () => {
    const a = createRng('seed-123');
    const b = createRng('seed-123');
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});

describe('Generator basic', () => {
  it('generates deterministic floor for a given seed', () => {
    const f1 = generateFloor('seed-xyz');
    const f2 = generateFloor('seed-xyz');
    // Exclude timestamp from comparison since it varies
    const { generatedAt: _t1, ...floor1 } = f1;
    const { generatedAt: _t2, ...floor2 } = f2;
    expect(JSON.stringify(floor1)).toBe(JSON.stringify(floor2));
  });

  it('produces solvable floor', () => {
    const f = generateFloor('seed-solvable');
    const v = validateFloor(f);
    expect(v.solvable).toBe(true);
    expect(v.errors.length).toBe(0);
  });
});

describe('Generator constraints', () => {
  it('respects provided entrance and exit', () => {
    const entrance = { x: 1, y: 1 };
    const exit = { x: 3, y: 3 };
    const floor = generateFloor('seed-config', { entrance, exit, width: 5, height: 5 });
    
    expect(floor.entrance).toEqual(entrance);
    expect(floor.exit).toEqual(exit);
    
    const entranceTile = floor.tiles.find(t => t.pos.x === entrance.x && t.pos.y === entrance.y);
    const exitTile = floor.tiles.find(t => t.pos.x === exit.x && t.pos.y === exit.y);
    
    expect(entranceTile?.kind).toBe('entrance');
    expect(exitTile?.kind).toBe('exit');
  });

  it('respects entity budgets', () => {
    const config = { enemyBudget: 2, chestBudget: 1 };
    const floor = generateFloor('seed-budget', config);
    
    const enemies = floor.entities.filter(e => e.kind === 'enemy');
    const items = floor.entities.filter(e => e.kind === 'item');
    
    expect(enemies.length).toBeLessThanOrEqual(config.enemyBudget);
    expect(items.length).toBeLessThanOrEqual(config.chestBudget);
  });

  it('places entities on walkable tiles only', () => {
    const floor = generateFloor('seed-entities');
    
    for (const entity of floor.entities) {
      const tile = floor.tiles.find(t => t.pos.x === entity.pos.x && t.pos.y === entity.pos.y);
      expect(tile?.walkable).toBe(true);
      expect(tile?.kind).not.toBe('wall');
    }
  });

  it('does not place entities on entrance or exit', () => {
    const floor = generateFloor('seed-overlap');
    
    for (const entity of floor.entities) {
      const isEntrance = entity.pos.x === floor.entrance.x && entity.pos.y === floor.entrance.y;
      const isExit = entity.pos.x === floor.exit.x && entity.pos.y === floor.exit.y;
      expect(isEntrance).toBe(false);
      expect(isExit).toBe(false);
    }
  });

  it('ensures entrance and exit are distinct', () => {
    for(let i=0; i<10; i++) {
       const floor = generateFloor(`seed-distinct-${i}`);
       expect(floor.entrance).not.toEqual(floor.exit);
    }
 });
});
