import { Vec2 } from './types';

function withinBounds(p: Vec2, w: number, h: number) {
  return p.x >= 0 && p.x < w && p.y >= 0 && p.y < h;
}

function neighbors(p: Vec2) {
  return [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 }
  ];
}

// Create a biased random path from entrance to exit. Guarantees reaching exit eventually
export function makePath(
  entrance: Vec2,
  exit: Vec2,
  width: number,
  height: number,
  rng: () => number,
  minLength = 3
) {
  const path: Vec2[] = [entrance];
  const visited = new Set<string>([`${entrance.x},${entrance.y}`]);
  let current = entrance;

  const maxSteps = width * height * 4;
  let steps = 0;

  while ((current.x !== exit.x || current.y !== exit.y) && steps < maxSteps) {
    steps++;
    const cand = neighbors(current).filter((n) => withinBounds(n, width, height));

    // prefer moves that reduce Manhattan distance to exit
    cand.sort((a, b) => {
      const da = Math.abs(a.x - exit.x) + Math.abs(a.y - exit.y);
      const db = Math.abs(b.x - exit.x) + Math.abs(b.y - exit.y);
      return da - db;
    });

    // choose among top K candidates with some randomness and allow detours
    const topK = Math.max(1, Math.min(3, cand.length));
    const choicePool = cand.slice(0, topK);

    // sometimes allow picking a non-top candidate to create detours
    if (rng() < 0.15 && cand.length > topK) {
      choicePool.push(...cand.slice(topK));
    }

    // filter visited to avoid immediate cycles when possible
    const unvisited = choicePool.filter((c) => !visited.has(`${c.x},${c.y}`));
    const pool = unvisited.length > 0 ? unvisited : choicePool;
    const next = pool[Math.floor(rng() * pool.length)];

    path.push(next);
    visited.add(`${next.x},${next.y}`);
    current = next;
  }

  // If exit wasn't reached (very unlikely), fallback: direct straight-line path
  if (current.x !== exit.x || current.y !== exit.y) {
    let cur = current;
    while (cur.x !== exit.x || cur.y !== exit.y) {
      if (cur.x < exit.x) cur = { x: cur.x + 1, y: cur.y };
      else if (cur.x > exit.x) cur = { x: cur.x - 1, y: cur.y };
      else if (cur.y < exit.y) cur = { x: cur.x, y: cur.y + 1 };
      else if (cur.y > exit.y) cur = { x: cur.x, y: cur.y - 1 };
      path.push(cur);
    }
  }

  // Ensure min length by adding simple detours if needed
  while (path.length < minLength) {
    const last = path[path.length - 1];
    const cand = neighbors(last).filter((n) => withinBounds(n, width, height));
    const next = cand[Math.floor(rng() * cand.length)];
    path.push(next);
  }

  return path;
}
