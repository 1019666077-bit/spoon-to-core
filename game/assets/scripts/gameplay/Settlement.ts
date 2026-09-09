import type { GameConfigs, TreasureConfig } from "../data/types";
import type { CatalogEntry, QualityId } from "../save/SaveSchema";
import type { PlacedItem } from "./BackpackGrid";

export const QUALITY_MULT: Record<QualityId, number> = {
  broken: 0.6,
  normal: 1,
  complete: 1.4,
  museum: 2,
};

export type SettlementLine = {
  instanceId: string;
  treasureId: string;
  nameZh: string;
  rarity: string;
  quality: QualityId;
  baseValue: number;
  qualityMult: number;
  firstFindBonus: number;
  total: number;
  firstFind: boolean;
};

export type SettlementInput = {
  runId: string;
  items: PlacedItem[];
  catalog: Record<string, CatalogEntry>;
  configs: GameConfigs;
  isFirstRun: boolean;
  alreadySettled: boolean;
  now: number;
};

export type SettlementResult = {
  runId: string;
  lines: SettlementLine[];
  gold: number;
  subsidy: number;
  skipped: boolean;
  catalog: Record<string, CatalogEntry>;
};

function lookup(configs: GameConfigs, id: string): TreasureConfig | undefined {
  return configs.treasures.find((t) => t.id === id);
}

export function settleRun(input: SettlementInput): SettlementResult {
  if (input.alreadySettled) {
    return {
      runId: input.runId,
      lines: [],
      gold: 0,
      subsidy: 0,
      skipped: true,
      catalog: { ...input.catalog },
    };
  }

  const catalog: Record<string, CatalogEntry> = { ...input.catalog };
  const lines: SettlementLine[] = [];
  let gold = 0;

  for (const item of input.items) {
    const treasure = lookup(input.configs, item.treasureId);
    if (!treasure) continue;
    const firstFind = !catalog[treasure.id];
    const qualityMult = QUALITY_MULT[item.quality];
    const base = treasure.value * qualityMult;
    const bonus = firstFind ? treasure.value * input.configs.rules.firstFindBonus : 0;
    const total = Math.floor(base + bonus);
    lines.push({
      instanceId: item.instanceId,
      treasureId: treasure.id,
      nameZh: treasure.nameZh,
      rarity: treasure.rarity,
      quality: item.quality,
      baseValue: treasure.value,
      qualityMult,
      firstFindBonus: bonus,
      total,
      firstFind,
    });
    gold += total;
    const prev = catalog[treasure.id];
    const rank = ["broken", "normal", "complete", "museum"];
    const best = prev
      ? rank.indexOf(item.quality) > rank.indexOf(prev.bestQuality)
        ? item.quality
        : prev.bestQuality
      : item.quality;
    catalog[treasure.id] = {
      discoveredAt: prev?.discoveredAt ?? input.now,
      bestQuality: best,
    };
  }

  let subsidy = 0;
  if (input.isFirstRun && gold < input.configs.rules.firstRunMinGold) {
    subsidy = input.configs.rules.firstRunMinGold - gold;
    gold += subsidy;
  }

  return { runId: input.runId, lines, gold, subsidy, skipped: false, catalog };
}
