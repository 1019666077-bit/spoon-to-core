import type { GameConfigs, LayerConfig } from "../data/types";
import type { SaveData } from "../save/SaveSchema";
import type { DigSession } from "./DigSession";

export function orderedLayers(configs: GameConfigs): LayerConfig[] {
  return [...configs.layers].sort((a, b) => a.depthMin - b.depthMin);
}

export function nextLayer(configs: GameConfigs, layerId: string): LayerConfig | null {
  const layers = orderedLayers(configs);
  const idx = layers.findIndex((layer) => layer.id === layerId);
  if (idx < 0) return null;
  return layers[idx + 1] ?? null;
}

export function isLayerUnlocked(save: SaveData, layerId: string): boolean {
  return save.unlockedLayerIds.includes(layerId);
}

/** Unlock the next stratum when the run reached the end room or the last three rows. */
export function applyUnlocks(save: SaveData, configs: GameConfigs, session: DigSession): string[] {
  const unlocked = new Set(save.unlockedLayerIds);
  const nearBottom = session.playerY >= session.map.height - 3;
  if (session.reachedEnd || nearBottom) {
    const next = nextLayer(configs, session.layerId);
    if (next) unlocked.add(next.id);
  }
  return [...unlocked];
}
