export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_KEY = "spoon-to-core.save";
export const SAVE_BACKUP_KEY = "spoon-to-core.save.bak";

export type QualityId = "broken" | "normal" | "complete" | "museum";

export type CatalogEntry = {
  discoveredAt: number;
  bestQuality: QualityId;
};

export type SaveSettings = {
  bgmVolume: number;
  sfxVolume: number;
  shake: boolean;
  language: "zh" | "en";
  quality: "low" | "mid" | "high";
};

export type SaveUpgrades = {
  toolId: string;
  staminaLevel: number;
  backpackLevel: number;
  radarLevel: number;
};

export type SaveData = {
  schemaVersion: number;
  gold: number;
  upgrades: SaveUpgrades;
  unlockedLayerIds: string[];
  catalog: Record<string, CatalogEntry>;
  quests: Record<string, unknown>;
  settings: SaveSettings;
  entitlements: {
    ads: Record<string, never>;
    iap: Record<string, never>;
  };
  lastSafeSaveAt: number;
  bootCount: number;
};

export function createDefaultSave(now: number = 0): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gold: 0,
    upgrades: {
      toolId: "rusty_spoon",
      staminaLevel: 0,
      backpackLevel: 0,
      radarLevel: 0,
    },
    unlockedLayerIds: ["backyard"],
    catalog: {},
    quests: {},
    settings: {
      bgmVolume: 0.8,
      sfxVolume: 1,
      shake: true,
      language: "zh",
      quality: "mid",
    },
    entitlements: { ads: {}, iap: {} },
    lastSafeSaveAt: now,
    bootCount: 0,
  };
}
