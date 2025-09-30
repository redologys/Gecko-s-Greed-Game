import type { Vector2D } from './types';

export const distance = (p1: Vector2D, p2: Vector2D): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export function getRandomElements<T>(arr: T[], num: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}
