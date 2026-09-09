import type { GameConfigs, Rarity, TreasureConfig } from "../data/types";
import type { SeededRandom } from "../domain/SeededRandom";

export type DropInput = {
  elapsed: number;
  treasuresFound: number;
  rareFound: number;
  isFirstRun: boolean;
  secondsSinceLastDrop: number;
  layerId: string;
};

export type DropDecision =
  | { kind: "none" }
  | { kind: "treasure"; forced: boolean; rarity: Rarity };

const RARE_SET: ReadonlySet<Rarity> = new Set(["rare", "epic", "legendary", "absurd"]);

export function isRareOrBetter(rarity: Rarity): boolean {
  return RARE_SET.has(rarity);
}

/**
 * Independent drop-protection function. Time gates beat the random roll.
 */
export function decideDrop(input: DropInput, rules: GameConfigs["rules"]): DropDecision {
  if (input.isFirstRun && input.elapsed >= rules.firstTreasureSeconds && input.treasuresFound === 0) {
    return { kind: "treasure", forced: true, rarity: "common" };
  }
  if (input.isFirstRun && input.elapsed >= rules.firstRareSeconds && input.rareFound === 0) {
    return { kind: "treasure", forced: true, rarity: "rare" };
  }
  if (input.secondsSinceLastDrop < rules.dropIntervalMin) return { kind: "none" };
  const window = rules.dropIntervalMax - rules.dropIntervalMin;
  const t = Math.min(1, (input.secondsSinceLastDrop - rules.dropIntervalMin) / Math.max(0.001, window));
  const chance = 0.18 + t * 0.72;
  if (chance >= 1) return { kind: "treasure", forced: false, rarity: "common" };
  return { kind: "none" };
}

export type RollDropInput = DropInput & {
  rng: SeededRandom;
  configs: GameConfigs;
};

export function rollDrop(input: RollDropInput): { treasure: TreasureConfig; forced: boolean } | null {
  const rules = input.configs.rules;
  const layer = input.configs.layers.find((l) => l.id === input.layerId);
  const pool = input.configs.treasures.filter((t) => (layer ? layer.treasureIds.includes(t.id) : t.layerId === input.layerId));
  const usable = pool.length > 0 ? pool : input.configs.treasures;

  if (input.isFirstRun && input.elapsed >= rules.firstTreasureSeconds && input.treasuresFound === 0) {
    const easy = usable.find((t) => t.id === "rusty_coin") ?? usable.find((t) => t.rarity === "common") ?? usable[0]!;
    return { treasure: easy, forced: true };
  }
  if (input.isFirstRun && input.elapsed >= rules.firstRareSeconds && input.rareFound === 0) {
    const rare = usable.find((t) => t.rarity === "rare") ?? usable.find((t) => isRareOrBetter(t.rarity)) ?? usable[0]!;
    return { treasure: rare, forced: true };
  }
  if (input.secondsSinceLastDrop < rules.dropIntervalMin) return null;

  const window = Math.max(0.001, rules.dropIntervalMax - rules.dropIntervalMin);
  const t = Math.min(1, (input.secondsSinceLastDrop - rules.dropIntervalMin) / window);
  const chance = 0.2 + t * 0.8;
  if (input.rng.next() > chance) return null;

  const rarityRoll = input.rng.next();
  let rarity: Rarity = "common";
  if (rarityRoll > 0.97) rarity = "legendary";
  else if (rarityRoll > 0.9) rarity = "epic";
  else if (rarityRoll > 0.72) rarity = "rare";
  else if (rarityRoll > 0.42) rarity = "uncommon";
  else if (rarityRoll > 0.97) rarity = "absurd";

  const matches = usable.filter((t) => t.rarity === rarity);
  const pickFrom = matches.length > 0 ? matches : usable;
  return { treasure: input.rng.pick(pickFrom), forced: false };
}

export function protectDecision(input: DropInput, rules: GameConfigs["rules"]): DropDecision {
  if (input.isFirstRun && input.elapsed >= rules.firstTreasureSeconds && input.treasuresFound === 0) {
    return { kind: "treasure", forced: true, rarity: "common" };
  }
  if (input.isFirstRun && input.elapsed >= rules.firstRareSeconds && input.rareFound === 0) {
    return { kind: "treasure", forced: true, rarity: "rare" };
  }
  return { kind: "none" };
}
