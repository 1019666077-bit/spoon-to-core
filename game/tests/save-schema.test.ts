import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";
import { migrateSave } from "../assets/scripts/save/migrations";
import { SaveManager } from "../assets/scripts/save/SaveManager";
import {
  createDefaultSave,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
} from "../assets/scripts/save/SaveSchema";

describe("save schema and migration", () => {
  it("default save uses current schemaVersion and safe zeros", () => {
    const save = createDefaultSave(1000);
    assert.equal(save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(save.gold, 0);
    assert.equal(save.upgrades.toolId, "chipped_bowl");
    assert.equal(save.toolForm, "bowl");
    assert.deepEqual(save.workerRoster, []);
    assert.deepEqual(save.unlockedSkillNodeIds, []);
    assert.equal(save.scrapeProgress, 0);
    assert.equal(save.skillPoints, 0);
    assert.equal(save.relicSlotsFilled, 0);
    assert.deepEqual(save.unlockedLayerIds, ["backyard"]);
    assert.equal(save.lastSafeSaveAt, 1000);
    assert.equal(save.tutorialCompleted, false);
    assert.equal(save.consumableStock.dynamite, 0);
  });

  it("migrates a v0 blob and keeps gold", () => {
    const result = migrateSave({ schemaVersion: 0, gold: 50 }, 2000);
    assert.equal(result.migrated, true);
    assert.equal(result.save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(result.save.gold, 50);
    assert.ok(result.errors.includes("migrated-from-v0"));
  });

  it("migrates a v1 blob into catalog/unlock fields", () => {
    const result = migrateSave(
      {
        schemaVersion: 1,
        gold: 40,
        upgrades: { toolId: "steel_spoon", staminaLevel: 1, backpackLevel: 0 },
        unlockedLayerIds: ["backyard"],
      },
      3,
    );
    assert.equal(result.save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(result.save.upgrades.toolId, "hearth_shovel");
    assert.equal(result.save.toolForm, "shovel");
    assert.equal(result.save.upgrades.staminaLevel, 1);
    assert.deepEqual(result.save.catalog, {});
    assert.deepEqual(result.save.workerRoster, []);
    assert.ok(result.migrated);
  });

  it("migrates a v2 blob into empire roster / scrape / bowl form", () => {
    const result = migrateSave(
      {
        schemaVersion: 2,
        gold: 88,
        upgrades: { toolId: "rusty_spoon", staminaLevel: 0, backpackLevel: 0, radarLevel: 0 },
        selectedLayerId: "backyard",
        unlockedLayerIds: ["backyard"],
      },
      4,
    );
    assert.equal(result.save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(result.save.gold, 88);
    assert.equal(result.save.upgrades.toolId, "chipped_bowl");
    assert.equal(result.save.toolForm, "bowl");
    assert.equal(result.save.scrapeProgress, 0);
    assert.deepEqual(result.save.unlockedSkillNodeIds, []);
    assert.ok(result.migrated);
    assert.ok(result.errors.includes("migrated-from-v2"));
  });

  it("falls back to defaults on garbage input", () => {
    const result = migrateSave("nope", 1);
    assert.equal(result.migrated, true);
    assert.equal(result.save.gold, 0);
    assert.ok(result.errors.includes("invalid-save-shape"));
  });

  it("writes defaults and reloads them through WebAdapter storage", async () => {
    const platform = new WebAdapter();
    await platform.initialize();
    const saves = new SaveManager(platform, () => 1234);
    const loaded = saves.load();
    assert.equal(loaded.save.schemaVersion, SAVE_SCHEMA_VERSION);
    loaded.save.gold = 12;
    assert.equal(saves.write(loaded.save), true);
    const again = new SaveManager(platform, () => 9999).load();
    assert.equal(again.save.gold, 12);
    assert.equal(again.save.schemaVersion, SAVE_SCHEMA_VERSION);
  });

  it("recovers from corrupt primary JSON using the backup", async () => {
    const platform = new WebAdapter();
    await platform.initialize();
    const saves = new SaveManager(platform, () => 10);
    const first = saves.load().save;
    first.gold = 77;
    saves.write(first);
    platform.persist(SAVE_KEY, "{not json");
    const recovered = new SaveManager(platform, () => 11).load();
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.save.gold, 77);
    assert.ok(recovered.errors.includes("primary-corrupt"));
  });

  it("future schema versions do not crash and use defaults", () => {
    const result = migrateSave({ schemaVersion: 99, gold: 999 }, 1);
    assert.equal(result.save.gold, 0);
    assert.ok(result.errors.includes("future-schema"));
  });
});
