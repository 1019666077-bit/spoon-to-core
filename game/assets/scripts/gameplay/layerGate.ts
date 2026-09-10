import type { GameConfigs, LayerConfig } from "../data/types";
import { nextLayer } from "./Layers";
import { scrapeRatio, type DirtField } from "./LayerDirtField";

export type LayerChoiceKind = "continue" | "descend" | "home";

export function scrapeReached(field: DirtField, layer: LayerConfig): boolean {
  if (field.remaining <= 0) return true;
  return scrapeRatio(field) >= layer.scrapeTarget;
}

export function descendTarget(configs: GameConfigs, currentLayerId: string): LayerConfig | null {
  return nextLayer(configs, currentLayerId);
}

export function layerHardness(layer: LayerConfig): number {
  return layer.dirtHp;
}
