import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirs = [join(root, "assets/config"), join(root, "assets/resources/config")];

const files = {
  "blocks.json": CONFIG_BUNDLE.blocks,
  "treasures.json": CONFIG_BUNDLE.treasures,
  "tools.json": CONFIG_BUNDLE.tools,
  "layers.json": CONFIG_BUNDLE.layers,
  "upgrades.json": CONFIG_BUNDLE.upgrades,
  "consumables.json": CONFIG_BUNDLE.consumables,
  "rules.json": CONFIG_BUNDLE.rules,
  "workers.json": CONFIG_BUNDLE.workers,
  "skill_nodes.json": CONFIG_BUNDLE.skillNodes,
  "loot.json": CONFIG_BUNDLE.loot,
};

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
  }
}

console.log(`wrote ${Object.keys(files).length} config files to assets/config and assets/resources/config`);
