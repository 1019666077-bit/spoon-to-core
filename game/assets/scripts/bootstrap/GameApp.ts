import { AnalyticsStub } from "../analytics/AnalyticsStub";
import type { GameConfigs } from "../data/types";
import { canTransition, GameStates, type GameStateId } from "../domain/GameState";
import { randomSeed, SeededRandom } from "../domain/SeededRandom";
import type { PlatformAdapter } from "../platform/PlatformAdapter";
import type { SaveManager } from "../save/SaveManager";
import type { SaveData } from "../save/SaveSchema";

export type GameAppDeps = {
  platform: PlatformAdapter;
  configs: GameConfigs;
  save: SaveData;
  saves: SaveManager;
  seed?: number;
};

export class GameApp {
  readonly platform: PlatformAdapter;
  readonly configs: GameConfigs;
  readonly saves: SaveManager;
  readonly analytics: AnalyticsStub;
  save: SaveData;
  state: GameStateId = GameStates.Boot;
  rng: SeededRandom;
  settingsOpen = false;

  private readonly listeners = new Set<() => void>();

  constructor(deps: GameAppDeps) {
    this.platform = deps.platform;
    this.configs = deps.configs;
    this.save = deps.save;
    this.saves = deps.saves;
    this.analytics = new AnalyticsStub(deps.platform);
    this.rng = new SeededRandom(deps.seed ?? randomSeed());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  enterHome(): void {
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
  }

  startDigging(): void {
    this.rng = new SeededRandom(randomSeed());
    this.transition(GameStates.Digging);
    this.platform.gameplayStart();
    this.analytics.report("run_start", { seed: this.rng.seed });
  }

  returnHomeFromDig(): void {
    if (this.state !== GameStates.Digging) return;
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
  }

  toggleSettings(open?: boolean): void {
    this.settingsOpen = open ?? !this.settingsOpen;
    this.emit();
  }

  persist(): boolean {
    return this.saves.write(this.save);
  }

  private transition(to: GameStateId): void {
    if (!canTransition(this.state, to)) {
      throw new Error(`Illegal state transition ${this.state} -> ${to}`);
    }
    this.state = to;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
