import { randomInt } from 'crypto';

export function randomPick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  return arr[randomInt(0, arr.length)];
}

export function randomShuffle<T>(arr: T[]): T[] {
  // Fisher-Yates with crypto.randomInt (max exclusive)
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
