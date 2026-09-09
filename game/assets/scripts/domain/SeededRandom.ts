/**
 * Mulberry32. Same seed always yields the same sequence.
 * Stage 0 only needs the generator; map generation arrives in stage 1.
 */
export class SeededRandom {
  readonly seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed === 0 ? 0x9e3779b9 : this.seed;
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, maxExclusive). */
  nextInt(min: number, maxExclusive: number): number {
    if (!(maxExclusive > min)) {
      throw new Error(`SeededRandom.nextInt invalid range [${min}, ${maxExclusive})`);
    }
    return min + Math.floor(this.next() * (maxExclusive - min));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("SeededRandom.pick empty list");
    return items[this.nextInt(0, items.length)] as T;
  }

  fork(salt: number): SeededRandom {
    return new SeededRandom((this.seed ^ (salt >>> 0) ^ 0x9e3779b9) >>> 0);
  }
}

export function randomSeed(now: number = Date.now()): number {
  return (now ^ 0xa5a5a5a5) >>> 0;
}
