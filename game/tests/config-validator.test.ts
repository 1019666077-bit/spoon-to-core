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
};

describe("config validation", () => {
  it("accepts the stage 0 JSON files", () => {
    const result = validateConfigs(fileBundle);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.configs.blocks.length, 4);
      assert.equal(result.configs.treasures.length, 5);
      assert.equal(result.configs.tools.length, 2);
      assert.equal(result.configs.layers.length, 1);
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
    raw.layers[0] = { ...raw.layers[0]!, blockIds: ["not_a_block"] };
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
