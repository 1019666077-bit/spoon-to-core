import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { loadConfigs } from "../assets/scripts/data/ConfigLoader";
import { validateConfigs } from "../assets/scripts/data/ConfigValidator";

const configDir = join(dirname(fileURLToPath(import.meta.url)), "../assets/config");

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(configDir, name), "utf8"));
}

const fileBundle = {
  blocks: readJson("blocks.json"),
  treasures: readJson("treasures.json"),
  tools: readJson("tools.json"),
  layers: readJson("layers.json"),
  upgrades: readJson("upgrades.json"),
  consumables: readJson("consumables.json"),
  rules: readJson("rules.json"),
  workers: readJson("workers.json"),
  skillNodes: readJson("skill_nodes.json"),
  loot: readJson("loot.json"),
};

describe("config validation", () => {
  it("accepts the greybox JSON files", () => {
    const result = validateConfigs(fileBundle);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.configs.blocks.length, CONFIG_BUNDLE.blocks.length);
      assert.equal(result.configs.treasures.length, CONFIG_BUNDLE.treasures.length);
      assert.equal(result.configs.tools.length, CONFIG_BUNDLE.tools.length);
      assert.equal(result.configs.layers.length, 5);
      assert.ok(result.configs.workers.length >= 3);
      assert.ok(result.configs.skillNodes.length >= 40);
      assert.ok(result.configs.loot.length >= 15);
      assert.equal(result.configs.tools[0]?.form, "bowl");
      assert.equal(result.configs.tools[0]?.id, "chipped_bowl");
    }
  });

  it("keeps TypeScript CONFIG_BUNDLE in sync with JSON files", () => {
    assert.deepEqual(CONFIG_BUNDLE, loadConfigs(fileBundle));
  });

  it("rejects duplicate ids", () => {
    const raw = structuredClone(fileBundle) as typeof CONFIG_BUNDLE;
    raw.blocks.push({ ...raw.blocks[0]! });
    const result = validateConfigs(raw);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((error) => error.message.includes("duplicate id")));
    }
  });

  it("rejects non-positive block hp", () => {
    const raw = structuredClone(fileBundle) as typeof CONFIG_BUNDLE;
    raw.blocks[0] = { ...raw.blocks[0]!, hp: 0 };
    const result = validateConfigs(raw);
    assert.equal(result.ok, false);
  });

  it("rejects unknown block references on a layer", () => {
    const raw = structuredClone(fileBundle) as typeof CONFIG_BUNDLE;
    raw.layers[0] = { ...raw.layers[0]!, blockIds: ["not_a_block"], blockWeights: { not_a_block: 1 } };
    const result = validateConfigs(raw);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((error) => error.message.includes("unknown block")));
    }
  });

  it("rejects a treasure shape that is only empty cells", () => {
    const raw = structuredClone(fileBundle) as typeof CONFIG_BUNDLE;
    raw.treasures[0] = { ...raw.treasures[0]!, shape: [[0, 0]] };
    const result = validateConfigs(raw);
    assert.equal(result.ok, false);
  });

  it("loadConfigs throws on invalid input", () => {
    assert.throws(() => loadConfigs({ blocks: [] }), /Invalid game config/);
  });
});
