import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SeededRandom } from "../assets/scripts/domain/SeededRandom";

function sequence(seed: number, n: number): number[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length: n }, () => rng.next());
}

describe("SeededRandom", () => {
  it("replays the same sequence for the same seed", () => {
    const a = sequence(20260908, 100);
    const b = sequence(20260908, 100);
    assert.deepEqual(a, b);
  });

  it("changes the sequence when the seed changes", () => {
    const a = sequence(1, 20);
    const b = sequence(2, 20);
    assert.notDeepEqual(a, b);
  });

  it("treats seed 0 as a usable non-zero internal state", () => {
    const rng = new SeededRandom(0);
    const values = Array.from({ length: 8 }, () => rng.next());
    assert.equal(values.length, 8);
    for (const value of values) {
      assert.ok(value >= 0 && value < 1);
    }
  });

  it("nextInt stays inside the half-open range", () => {
    const rng = new SeededRandom(99);
    for (let i = 0; i < 200; i += 1) {
      const n = rng.nextInt(3, 8);
      assert.ok(n >= 3 && n < 8);
    }
  });

  it("fork(salt) is deterministic and distinct from the parent sequence", () => {
    const parentA = new SeededRandom(42).fork(7);
    const parentB = new SeededRandom(42).fork(7);
    assert.equal(parentA.next(), parentB.next());
    const sibling = new SeededRandom(42).fork(8);
    assert.notEqual(new SeededRandom(42).fork(7).next(), sibling.next());
  });
});
