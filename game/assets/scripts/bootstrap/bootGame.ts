import { loadConfigs } from "../data/ConfigLoader";
import type { GameConfigs } from "../data/types";
import type { PlatformAdapter } from "../platform/PlatformAdapter";
import { SaveManager } from "../save/SaveManager";
import { GameApp } from "./GameApp";

export type BootInput = {
  platform: PlatformAdapter;
  configs: unknown;
  now?: () => number;
  seed?: number;
};

export type BootResult = {
  app: GameApp;
  configs: GameConfigs;
  saveErrors: string[];
};

export async function bootGame(input: BootInput): Promise<BootResult> {
  await input.platform.initialize();
  const configs = loadConfigs(input.configs);
  const saves = new SaveManager(input.platform, input.now);
  const loaded = saves.load();
  loaded.save.bootCount += 1;
  const app = new GameApp({
    platform: input.platform,
    configs,
    save: loaded.save,
    saves,
    seed: input.seed,
  });
  // Stage 1.5′: first glance is the dirt pit + bowl, not the Home button wall.
  app.startDigging();
  const persisted = app.persist();
  if (!persisted) {
    loaded.errors.push("boot-persist-failed");
  }
  return { app, configs, saveErrors: loaded.errors };
}
