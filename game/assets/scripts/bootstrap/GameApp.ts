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

  /** Seed supplied at boot. When set, startDigging reuses it instead of rolling a new one. */
  readonly injectedSeed: number | undefined;
  private readonly listeners = new Set<() => void>();

  constructor(deps: GameAppDeps) {
    this.platform = deps.platform;
    this.configs = deps.configs;
    this.save = deps.save;
    this.saves = deps.saves;
    this.analytics = new AnalyticsStub(deps.platform);
    this.injectedSeed = deps.seed;
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

  /**
   * Starts an empty digging session.
   * Seed order: explicit argument → boot-injected seed → fresh random seed.
   * Never silently discards a seed the test (or boot) already chose.
   */
  startDigging(seed?: number): void {
    const runSeed = seed ?? this.injectedSeed ?? randomSeed();
    this.rng = new SeededRandom(runSeed);
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
