import type { GameConfigs, LayerConfig, LootConfig } from "../data/types";
import type { SeededRandom } from "../domain/SeededRandom";

export type ScoopYield = {
  gold: number;
  loot: LootConfig | null;
  mudValue: number;
};

export function lootForLayer(configs: GameConfigs, layerId: string): LootConfig[] {
  return configs.loot.filter((item) => item.layerId === "" || item.layerId === layerId);
}

export function goldPerScoop(layer: LayerConfig): number {
  return 1 + Math.max(0, Math.floor(layer.recommendedPower));
}

/**
 * Every scoop pays a layer gold stipend, then may roll a sellable clod / flake / relic chip.
 */
export function rollScoopYield(rng: SeededRandom, configs: GameConfigs, layer: LayerConfig): ScoopYield {
  const gold = goldPerScoop(layer);
  const pool = lootForLayer(configs, layer.id);
  if (pool.length === 0) return { gold, loot: null, mudValue: 0 };

  const roll = rng.next();
  if (roll > 0.55) return { gold, loot: null, mudValue: 0 };

  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng.next() * total;
  let picked = pool[pool.length - 1]!;
  for (const item of pool) {
    cursor -= item.weight;
    if (cursor <= 0) {
      picked = item;
      break;
    }
  }
  const mudValue = picked.kind === "mud" ? picked.sellValue : 0;
  return { gold: gold + picked.sellValue, loot: picked, mudValue };
}
