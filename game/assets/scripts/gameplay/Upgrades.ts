import type { GameConfigs, ToolConfig } from "../data/types";
import type { SaveData } from "../save/SaveSchema";

export type BuyResult =
  | { ok: true; save: SaveData; spent: number }
  | { ok: false; reason: "poor" | "max" | "unknown"; save: SaveData };

function cloneSave(save: SaveData): SaveData {
  return {
    ...save,
    upgrades: { ...save.upgrades },
    unlockedLayerIds: [...save.unlockedLayerIds],
    catalog: { ...save.catalog },
    quests: { ...save.quests },
    settings: { ...save.settings },
    entitlements: { ads: {}, iap: {} },
  };
}

export function staminaMax(save: SaveData, configs: GameConfigs): number {
  const tier = configs.upgrades.stamina.find((t) => t.level === save.upgrades.staminaLevel);
  return tier?.max ?? configs.upgrades.stamina[0]!.max;
}

export function backpackTier(save: SaveData, configs: GameConfigs): { cols: number; rows: number } {
  const tier = configs.upgrades.backpack.find((t) => t.level === save.upgrades.backpackLevel);
  return tier ? { cols: tier.cols, rows: tier.rows } : { cols: 3, rows: 4 };
}

export function currentTool(save: SaveData, configs: GameConfigs): ToolConfig {
  return configs.tools.find((t) => t.id === save.upgrades.toolId) ?? configs.tools[0]!;
}

export function nextTool(save: SaveData, configs: GameConfigs): ToolConfig | null {
  const idx = configs.tools.findIndex((t) => t.id === save.upgrades.toolId);
  if (idx < 0) return configs.tools[1] ?? null;
  return configs.tools[idx + 1] ?? null;
}

export function nextStamina(save: SaveData, configs: GameConfigs) {
  return configs.upgrades.stamina.find((t) => t.level === save.upgrades.staminaLevel + 1) ?? null;
}

export function nextBackpack(save: SaveData, configs: GameConfigs) {
  return configs.upgrades.backpack.find((t) => t.level === save.upgrades.backpackLevel + 1) ?? null;
}

export function buyTool(save: SaveData, configs: GameConfigs): BuyResult {
  const next = nextTool(save, configs);
  if (!next) return { ok: false, reason: "max", save };
  if (save.gold < next.price) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.gold -= next.price;
  copy.upgrades.toolId = next.id;
  return { ok: true, save: copy, spent: next.price };
}

export function buyStamina(save: SaveData, configs: GameConfigs): BuyResult {
  const next = nextStamina(save, configs);
  if (!next) return { ok: false, reason: "max", save };
  if (save.gold < next.price) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.gold -= next.price;
  copy.upgrades.staminaLevel = next.level;
  return { ok: true, save: copy, spent: next.price };
}

export function buyBackpack(save: SaveData, configs: GameConfigs): BuyResult {
  const next = nextBackpack(save, configs);
  if (!next) return { ok: false, reason: "max", save };
  if (save.gold < next.price) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.gold -= next.price;
  copy.upgrades.backpackLevel = next.level;
  return { ok: true, save: copy, spent: next.price };
}

export function buyConsumable(save: SaveData, configs: GameConfigs, id: string): BuyResult {
  const item = configs.consumables.find((c) => c.id === id);
  if (!item) return { ok: false, reason: "unknown", save };
  if (save.gold < item.price) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.gold -= item.price;
  const stock = { ...copy.consumableStock };
  stock[id] = (stock[id] ?? 0) + 1;
  copy.consumableStock = stock;
  return { ok: true, save: copy, spent: item.price };
}

export function powerWarning(save: SaveData, configs: GameConfigs, layerId: string): boolean {
  const layer = configs.layers.find((l) => l.id === layerId);
  if (!layer) return false;
  return currentTool(save, configs).power < layer.recommendedPower;
}
