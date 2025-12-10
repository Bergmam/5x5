import { describe, it, expect } from 'vitest';
import { generateFloor } from '../src/game/generator';
import { EnemyData } from '../src/game/types';

describe('Enemy instantiation modes', () => {
  it('enemies are never instantiated in follow mode', () => {
    const floor = generateFloor('enemy-instantiation-seed', { enemyBudget: 5 });
    const enemies = floor.entities.filter(e => e.kind === 'enemy');
    for (const e of enemies) {
      const data = e.data as EnemyData;
      const initialMode = data.state?.mode ?? data.ai ?? 'static';
      expect(initialMode).not.toBe('follow');
    }
  });
});
