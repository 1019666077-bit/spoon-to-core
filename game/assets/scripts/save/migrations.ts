import {
  createDefaultSave,
  SAVE_SCHEMA_VERSION,
  type CatalogEntry,
  type QualityId,
  type SaveData,
  type SaveSettings,
  type SaveUpgrades,
} from "./SaveSchema";

export type MigrationResult = {
  save: SaveData;
  migrated: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (min !== undefined && value < min) return fallback;
  return value;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function migrateUpgrades(raw: unknown, fallback: SaveUpgrades): SaveUpgrades {
  if (!isRecord(raw)) return { ...fallback };
  return {
    toolId: str(raw.toolId, fallback.toolId),
    staminaLevel: num(raw.staminaLevel, fallback.staminaLevel, 0),
    backpackLevel: num(raw.backpackLevel, fallback.backpackLevel, 0),
    radarLevel: num(raw.radarLevel, fallback.radarLevel, 0),
  };
}

function migrateSettings(raw: unknown, fallback: SaveSettings): SaveSettings {
  if (!isRecord(raw)) return { ...fallback };
  const language = raw.language === "en" ? "en" : "zh";
  const quality = raw.quality === "low" || raw.quality === "high" ? raw.quality : "mid";
  return {
    bgmVolume: clamp01(num(raw.bgmVolume, fallback.bgmVolume)),
    sfxVolume: clamp01(num(raw.sfxVolume, fallback.sfxVolume)),
    shake: bool(raw.shake, fallback.shake),
    language,
    quality,
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function migrateCatalog(raw: unknown): Record<string, CatalogEntry> {
  if (!isRecord(raw)) return {};
  const qualities: QualityId[] = ["broken", "normal", "complete", "museum"];
  const catalog: Record<string, CatalogEntry> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!isRecord(entry)) continue;
    const quality = qualities.includes(entry.bestQuality as QualityId)
      ? (entry.bestQuality as QualityId)
      : "normal";
    catalog[id] = {
      discoveredAt: num(entry.discoveredAt, 0, 0),
      bestQuality: quality,
    };
  }
  return catalog;
}

function migrateUnlocked(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const ids = raw.filter((item): item is string => typeof item === "string" && item.length > 0);
  return ids.length > 0 ? ids : [...fallback];
}

function migrateStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function migrateDepth(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[id] = value;
  }
  return out;
}

function migrateStock(raw: unknown, fallback: Record<string, number>): Record<string, number> {
  const out = { ...fallback };
  if (!isRecord(raw)) return out;
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[id] = value;
  }
  return out;
}

/**
 * Accepts any historical blob and returns the current schema.
 * Unknown future versions fall back to defaults and keep an error flag.
 */
export function migrateSave(raw: unknown, now: number = 0): MigrationResult {
  const defaults = createDefaultSave(now);
  const errors: string[] = [];

  if (raw === undefined || raw === null) {
    return { save: defaults, migrated: true, errors: ["empty-save"] };
  }
  if (!isRecord(raw)) {
    return { save: defaults, migrated: true, errors: ["invalid-save-shape"] };
  }

  const version = num(raw.schemaVersion, 0, 0);
  if (version > SAVE_SCHEMA_VERSION) {
    return { save: defaults, migrated: true, errors: ["future-schema"] };
  }

  const save: SaveData = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gold: num(raw.gold, defaults.gold, 0),
    upgrades: migrateUpgrades(raw.upgrades, defaults.upgrades),
    unlockedLayerIds: migrateUnlocked(raw.unlockedLayerIds, defaults.unlockedLayerIds),
    catalog: migrateCatalog(raw.catalog),
    quests: isRecord(raw.quests) ? { ...raw.quests } : {},
    settings: migrateSettings(raw.settings, defaults.settings),
    entitlements: { ads: {}, iap: {} },
    lastSafeSaveAt: num(raw.lastSafeSaveAt, now, 0),
    bootCount: num(raw.bootCount, defaults.bootCount, 0),
    tutorialCompleted: bool(raw.tutorialCompleted, defaults.tutorialCompleted),
    tutorialStep: num(raw.tutorialStep, defaults.tutorialStep, 0),
    runCount: num(raw.runCount, defaults.runCount, 0),
    settledRunIds: migrateStringArray(raw.settledRunIds),
    bestDepthByLayer: migrateDepth(raw.bestDepthByLayer),
    selectedLayerId: str(raw.selectedLayerId, defaults.selectedLayerId),
    consumableStock: migrateStock(raw.consumableStock, defaults.consumableStock),
  };

  const migrated = version < SAVE_SCHEMA_VERSION;
  if (migrated) errors.push(`migrated-from-v${version}`);
  return { save, migrated, errors };
}
