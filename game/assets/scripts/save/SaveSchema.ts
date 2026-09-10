import type { ToolForm } from "../data/types";

export const SAVE_SCHEMA_VERSION = 4;
export const SAVE_KEY = "spoon-to-core.save";
export const SAVE_BACKUP_KEY = "spoon-to-core.save.bak";

export const STARTING_TOOL_ID = "chipped_bowl";
export const STARTING_TOOL_FORM: ToolForm = "bowl";

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
  tutorialCompleted: boolean;
  tutorialStep: number;
  runCount: number;
  settledRunIds: string[];
  bestDepthByLayer: Record<string, number>;
  selectedLayerId: string;
  consumableStock: Record<string, number>;
  /** Hired worker ids (empire roster). */
  workerRoster: string[];
  /** Skill nodes the player has committed. Most stay empty in stage 0′. */
  unlockedSkillNodeIds: string[];
  toolForm: ToolForm;
  /** 0–1 scrape progress on the current layer dirt field. */
  scrapeProgress: number;
  /** Spendable tree points from dirt milestones / layer progress. */
  skillPoints: number;
  /** Lifetime dirt scooped on the empire path. */
  lifetimeDirt: number;
  /** Puzzle-shard counter for the relic placeholder. */
  shardPieces: number;
  /** Filled relic slots (cap in relics.ts). */
  relicSlotsFilled: number;
  /** Current outing: dirt dealt by hired crew. */
  workerPeriodDirt: number;
  /** Current outing: gold produced by hired crew. */
  workerPeriodGold: number;
  /** Remaining breakthrough cooldown seconds. */
  breakthroughCooldown: number;
};

export function createDefaultSave(now: number = 0): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gold: 0,
    upgrades: {
      toolId: STARTING_TOOL_ID,
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
    tutorialCompleted: false,
    tutorialStep: 0,
    runCount: 0,
    settledRunIds: [],
    bestDepthByLayer: {},
    selectedLayerId: "backyard",
    consumableStock: { dynamite: 0, energy_drink: 0 },
    workerRoster: [],
    unlockedSkillNodeIds: [],
    toolForm: STARTING_TOOL_FORM,
    scrapeProgress: 0,
    skillPoints: 0,
    lifetimeDirt: 0,
    shardPieces: 0,
    relicSlotsFilled: 0,
    workerPeriodDirt: 0,
    workerPeriodGold: 0,
    breakthroughCooldown: 0,
  };
}

export function cloneSave(save: SaveData): SaveData {
  return {
    ...save,
    upgrades: { ...save.upgrades },
    unlockedLayerIds: [...save.unlockedLayerIds],
    catalog: { ...save.catalog },
    quests: { ...save.quests },
    settings: { ...save.settings },
    entitlements: { ads: {}, iap: {} },
    workerRoster: [...save.workerRoster],
    unlockedSkillNodeIds: [...save.unlockedSkillNodeIds],
    bestDepthByLayer: { ...save.bestDepthByLayer },
    consumableStock: { ...save.consumableStock },
  };
}

/** Old spoon ids from schema v1–v2 map onto the bowl → shovel table. */
export const LEGACY_TOOL_IDS: Record<string, string> = {
  rusty_spoon: "chipped_bowl",
  steel_spoon: "hearth_shovel",
  twin_spoon: "twin_bit_shovel",
  vibro_spoon: "quake_shovel",
  turbo_spoon: "whirl_auger",
  plasma_spoon: "ion_core_shovel",
  antimatter_spoon: "void_scoop",
};

export const TOOL_FORM_BY_ID: Record<string, ToolForm> = {
  chipped_bowl: "bowl",
  hearth_shovel: "shovel",
  yard_iron_shovel: "shovel",
  twin_bit_shovel: "shovel",
  quake_shovel: "shovel",
  whirl_auger: "auger",
  ion_core_shovel: "shovel",
  void_scoop: "scoop",
};
