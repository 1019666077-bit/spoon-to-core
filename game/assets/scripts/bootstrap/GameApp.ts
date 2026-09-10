import { AnalyticsStub } from "../analytics/AnalyticsStub";
import { Sfx } from "../audio/Sfx";
import type { GameConfigs, LayerConfig, ToolConfig } from "../data/types";
import { canTransition, GameStates, type GameStateId } from "../domain/GameState";
import { randomSeed, SeededRandom } from "../domain/SeededRandom";
import { DigSession } from "../gameplay/DigSession";
import {
  clickDirtWithTool,
  createDirtField,
  refillDirt,
  scrapeRatio,
  type DirtField,
} from "../gameplay/LayerDirtField";
import { applyUnlocks, isLayerUnlocked, orderedLayers } from "../gameplay/Layers";
import { settleRun, type SettlementResult } from "../gameplay/Settlement";
import { rosterSlots, type WorkerSlot } from "../gameplay/workers";
import {
  advanceTutorial,
  createTutorial,
  tutorialText,
  type TutorialState,
} from "../gameplay/Tutorial";
import {
  backpackTier,
  buyBackpack,
  buyConsumable,
  buyStamina,
  buyTool,
  currentTool,
  nextBackpack,
  nextStamina,
  nextTool,
  powerWarning,
  staminaMax,
} from "../gameplay/Upgrades";
import type { PlatformAdapter } from "../platform/PlatformAdapter";
import type { SaveManager } from "../save/SaveManager";
import type { SaveData } from "../save/SaveSchema";

export type HomePanel = "hub" | "crew" | "tree" | "stats" | "play" | "shop" | "catalog";

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
  readonly sfx: Sfx;
  save: SaveData;
  state: GameStateId = GameStates.Boot;
  rng: SeededRandom;
  settingsOpen = false;
  homePanel: HomePanel = "hub";
  session: DigSession | null = null;
  dirtField: DirtField | null = null;
  lastSettlement: SettlementResult | null = null;
  unlockedNotice: string[] = [];
  toast: string | null = null;
  discardConfirmId: string | null = null;
  runSeed = 0;
  hudRevision = 0;

  /** Seed supplied at boot. When set, startDigging reuses it instead of rolling a new one. */
  readonly injectedSeed: number | undefined;
  private readonly listeners = new Set<() => void>();
  private settlementApplied = false;

  constructor(deps: GameAppDeps) {
    this.platform = deps.platform;
    this.configs = deps.configs;
    this.save = deps.save;
    this.saves = deps.saves;
    this.analytics = new AnalyticsStub(deps.platform);
    this.injectedSeed = deps.seed;
    this.rng = new SeededRandom(deps.seed ?? randomSeed());
    this.sfx = new Sfx();
    this.sfx.setVolume(this.save.settings.sfxVolume);
    this.sfx.enabled = this.save.settings.sfxVolume > 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get tutorial(): TutorialState {
    return createTutorial(this.save.tutorialCompleted, this.save.tutorialStep);
  }

  get tutorialHint(): string | null {
    return tutorialText(this.tutorial);
  }

  get tool(): ToolConfig {
    return currentTool(this.save, this.configs);
  }

  get staminaCap(): number {
    return staminaMax(this.save, this.configs);
  }

  get bagSize(): { cols: number; rows: number } {
    return backpackTier(this.save, this.configs);
  }

  get currentLayer(): LayerConfig {
    return (
      this.configs.layers.find((layer) => layer.id === this.save.selectedLayerId) ??
      this.configs.layers[0]!
    );
  }

  get layers(): LayerConfig[] {
    return orderedLayers(this.configs);
  }

  get nextTool() {
    return nextTool(this.save, this.configs);
  }

  get nextStamina() {
    return nextStamina(this.save, this.configs);
  }

  get nextBackpack() {
    return nextBackpack(this.save, this.configs);
  }

  get powerWarn(): boolean {
    return powerWarning(this.save, this.configs, this.save.selectedLayerId);
  }

  get workerSlots(): WorkerSlot[] {
    return rosterSlots(this.configs, this.save.workerRoster);
  }

  get currentDepthMeters(): number {
    return this.save.bestDepthByLayer[this.save.selectedLayerId] ?? this.currentLayer.depthMin;
  }

  enterHome(): void {
    this.session = null;
    this.homePanel = "hub";
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
  }

  /**
   * Starts a digging run.
   * Seed order: explicit argument → boot-injected seed → tutorial seed on first run → fresh random.
   */
  startDigging(seed?: number): void {
    this.sfx.unlock();
    this.settingsOpen = false;
    const firstRun = this.save.runCount === 0;
    const runSeed =
      seed ?? this.injectedSeed ?? (firstRun ? this.configs.rules.tutorialSeed : randomSeed());
    this.runSeed = runSeed;
    this.rng = new SeededRandom(runSeed);
    const bag = backpackTier(this.save, this.configs);
    this.session = new DigSession({
      configs: this.configs,
      seed: runSeed,
      layerId: this.save.selectedLayerId,
      tool: currentTool(this.save, this.configs),
      staminaMax: staminaMax(this.save, this.configs),
      backpack: bag,
      firstRun,
      dynamite: this.save.consumableStock.dynamite ?? 0,
      drinks: this.save.consumableStock.energy_drink ?? 0,
      runId: `run-${this.save.runCount}-${runSeed}`,
    });
    this.dirtField = createDirtField(this.currentLayer, this.save.scrapeProgress);
    this.save.toolForm = this.tool.form;
    this.save.runCount += 1;
    this.lastSettlement = null;
    this.settlementApplied = false;
    this.unlockedNotice = [];
    this.discardConfirmId = null;
    if (this.save.runCount >= 2) this.noteTutorial("second_run_started");
    this.transition(GameStates.Digging);
    this.platform.gameplayStart();
    this.analytics.report("run_start", {
      seed: runSeed,
      layerId: this.save.selectedLayerId,
      firstRun,
    });
    this.sfx.play("ui");
    this.persist();
  }

  tick(dt: number): void {
    if (this.state !== GameStates.Digging || !this.session) return;
    const treasures = this.session.treasuresFound;
    const almost = this.session.bagAlmostFullFired;
    this.session.tick(dt);
    if (this.session.lastHit?.broke) this.noteTutorial("block_broken");
    if (this.session.treasuresFound > treasures) this.noteTutorial("treasure_got");
    if (this.session.bagAlmostFullFired && !almost) this.noteTutorial("bag_almost_full");
    if (this.session.wantsResult) {
      this.finishRun();
      return;
    }
    if (this.session.dirtyHud) {
      this.session.dirtyHud = false;
      this.bump();
    }
  }

  /** Hold-return / explicit finish. Settles and opens the result screen. */
  returnFromDig(): void {
    if (this.state !== GameStates.Digging || !this.session) return;
    this.session.completeReturn();
    this.finishRun();
  }

  /** Stage 0 name. Greybox MVP routes through result. Empire path uses layer_choice. */
  returnHomeFromDig(): void {
    if (this.state === GameStates.LayerChoice) {
      this.returnHomeFromLayer();
      return;
    }
    if (this.state === GameStates.Digging) this.returnFromDig();
    else if (this.state === GameStates.Result) this.acknowledgeResult();
  }

  /** Main empire dig: click the dirt patch. Pure field math, no maze adjacency. */
  clickDirtPatch(): boolean {
    if (this.state !== GameStates.Digging || !this.dirtField) return false;
    this.sfx.unlock();
    const result = clickDirtWithTool(this.dirtField, this.tool);
    this.dirtField = result.field;
    this.save.scrapeProgress = scrapeRatio(result.field);
    this.save.toolForm = this.tool.form;
    if (result.dealt > 0) this.sfx.play("hit");
    if (result.emptied) {
      this.sfx.play("break");
      this.enterLayerChoice();
      return true;
    }
    this.persist();
    this.bump();
    return result.dealt > 0;
  }

  enterLayerChoice(): void {
    if (this.state !== GameStates.Digging) return;
    this.persistScrape();
    this.transition(GameStates.LayerChoice);
    this.platform.gameplayStop();
    this.sfx.play("ui");
  }

  /** Layer gate: keep scraping the same field. */
  continueScavenge(): void {
    if (this.state !== GameStates.LayerChoice || !this.dirtField) return;
    this.dirtField = refillDirt(this.dirtField, Math.max(8, Math.floor(this.dirtField.max * 0.35)));
    this.save.scrapeProgress = scrapeRatio(this.dirtField);
    this.transition(GameStates.Digging);
    this.platform.gameplayStart();
    this.sfx.play("ui");
    this.persist();
  }

  /** Layer gate stub: stay on the current layer skin. Full descend lands in stage 1′. */
  descendLayer(): boolean {
    if (this.state !== GameStates.LayerChoice) return false;
    this.flash("下潜占位：阶段 1′ 再接通下一层");
    this.sfx.play("warn");
    return false;
  }

  returnHomeFromLayer(): void {
    if (this.state !== GameStates.LayerChoice) return;
    this.persistScrape();
    this.session = null;
    this.dirtField = null;
    this.homePanel = "hub";
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
    this.sfx.play("ui");
    this.persist();
  }

  private persistScrape(): void {
    if (this.dirtField) this.save.scrapeProgress = scrapeRatio(this.dirtField);
    this.save.toolForm = this.tool.form;
    this.persist();
  }

  acknowledgeResult(): void {
    if (this.state !== GameStates.Result) return;
    this.noteTutorial("settled");
    this.session = null;
    this.dirtField = null;
    this.homePanel = "hub";
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
    this.sfx.play("ui");
    this.persist();
  }

  digPointerDown(x: number, y: number): boolean {
    if (!this.session || this.state !== GameStates.Digging) return false;
    this.sfx.unlock();
    const treasures = this.session.treasuresFound;
    const ok = this.session.pointerDown(x, y);
    this.afterHit(treasures);
    return ok;
  }

  digPointerUp(): void {
    this.session?.pointerUp();
  }

  digSelect(dx: number, dy: number): void {
    this.session?.moveSelect(dx, dy);
    this.bump();
  }

  digSelected(): void {
    if (!this.session) return;
    const treasures = this.session.treasuresFound;
    this.session.digSelected();
    this.afterHit(treasures);
  }

  holdReturn(held: boolean): void {
    if (!this.session) return;
    this.session.setReturnHeld(held);
    if (held) this.sfx.play("return");
    this.bump();
  }

  togglePause(on?: boolean): void {
    this.session?.togglePause(on);
    this.sfx.play("ui");
    this.bump();
  }

  openBackpack(open: boolean): void {
    this.session?.openBackpack(open);
    this.sfx.play("ui");
    this.bump();
  }

  tryPlacePending(): boolean {
    if (!this.session) return false;
    const ok = this.session.tryPlacePending();
    this.bump();
    return ok;
  }

  discardPending(): void {
    this.session?.discardPending();
    this.bump();
  }

  rotateItem(id: string): boolean {
    if (!this.session) return false;
    const ok = this.session.rotateItem(id);
    if (ok) this.noteTutorial("bag_sorted");
    this.bump();
    return ok;
  }

  moveItem(id: string, x: number, y: number): boolean {
    if (!this.session) return false;
    const ok = this.session.moveItem(id, x, y);
    if (ok) this.noteTutorial("bag_sorted");
    this.bump();
    return ok;
  }

  discardItem(id: string, confirmed = false): boolean {
    if (!this.session) return false;
    const ok = this.session.discardItem(id, confirmed);
    if (!ok && !confirmed) {
      this.discardConfirmId = id;
      this.bump();
      return false;
    }
    this.discardConfirmId = null;
    this.bump();
    return ok;
  }

  insureItem(id: string): boolean {
    const ok = this.session?.insureItem(id) ?? false;
    this.bump();
    return ok;
  }

  useDynamite(): boolean {
    if (!this.session) return false;
    const treasures = this.session.treasuresFound;
    const ok = this.session.useDynamite();
    if (ok) {
      this.sfx.play("break");
      this.afterHit(treasures);
    } else this.sfx.play("warn");
    this.bump();
    return ok;
  }

  useDrink(): boolean {
    if (!this.session) return false;
    const ok = this.session.useDrink();
    this.sfx.play(ok ? "ui" : "warn");
    this.bump();
    return ok;
  }

  selectLayer(id: string): boolean {
    if (!isLayerUnlocked(this.save, id)) {
      this.flash("尚未解锁");
      this.sfx.play("warn");
      return false;
    }
    this.save.selectedLayerId = id;
    this.sfx.play("ui");
    this.persist();
    this.bump();
    return true;
  }

  setHomePanel(panel: HomePanel): void {
    this.homePanel = panel === "play" ? "hub" : panel;
    this.sfx.play("ui");
    this.bump();
  }

  buy(kind: "tool" | "stamina" | "backpack" | "dynamite" | "energy_drink"): boolean {
    this.sfx.unlock();
    const result =
      kind === "tool"
        ? buyTool(this.save, this.configs)
        : kind === "stamina"
          ? buyStamina(this.save, this.configs)
          : kind === "backpack"
            ? buyBackpack(this.save, this.configs)
            : buyConsumable(this.save, this.configs, kind);
    if (!result.ok) {
      this.flash(result.reason === "poor" ? "金币不足" : result.reason === "max" ? "已满级" : "无法购买");
      this.sfx.play("warn");
      return false;
    }
    this.save = result.save;
    if (kind === "backpack") this.noteTutorial("upgraded_backpack");
    this.flash("购置完成");
    this.sfx.play("shop");
    this.persist();
    this.bump();
    return true;
  }

  toggleSettings(open?: boolean): void {
    this.settingsOpen = open ?? !this.settingsOpen;
    this.sfx.play("ui");
    this.bump();
  }

  setSetting<K extends keyof SaveData["settings"]>(key: K, value: SaveData["settings"][K]): void {
    this.save = { ...this.save, settings: { ...this.save.settings, [key]: value } };
    if (key === "sfxVolume" && typeof value === "number") {
      this.sfx.setVolume(value);
      this.sfx.enabled = value > 0;
    }
    this.persist();
    this.bump();
  }

  persist(): boolean {
    return this.saves.write(this.save);
  }

  noteTutorial(event: string): void {
    const before = this.tutorial;
    const after = advanceTutorial(before, event);
    if (after.stepIndex === before.stepIndex && after.completed === before.completed) return;
    this.save.tutorialStep = after.stepIndex;
    this.save.tutorialCompleted = after.completed;
    this.persist();
  }

  private afterHit(treasuresBefore: number): void {
    if (!this.session) return;
    const hit = this.session.lastHit;
    if (hit?.broke) {
      this.sfx.play("break");
      this.noteTutorial("block_broken");
    } else if (hit && hit.damage > 0) {
      this.sfx.play("hit");
    }
    if (this.session.treasuresFound > treasuresBefore) {
      this.sfx.play("treasure");
      this.noteTutorial("treasure_got");
    }
    if (this.session.bagAlmostFullFired) this.noteTutorial("bag_almost_full");
    this.bump();
  }

  private finishRun(): void {
    if (!this.session || this.settlementApplied) {
      if (this.state === GameStates.Digging) this.transition(GameStates.Result);
      return;
    }
    const beforeUnlock = new Set(this.save.unlockedLayerIds);
    const result = settleRun({
      runId: this.session.runId,
      items: this.session.backpack.snapshot(),
      catalog: this.save.catalog,
      configs: this.configs,
      isFirstRun: this.session.firstRun,
      alreadySettled: this.save.settledRunIds.includes(this.session.runId),
      now: Date.now(),
    });
    this.lastSettlement = result;
    if (!result.skipped) {
      this.save.gold += result.gold;
      this.save.catalog = result.catalog;
      this.save.settledRunIds = [...this.save.settledRunIds, this.session.runId];
      this.save.consumableStock = {
        ...this.save.consumableStock,
        dynamite: Math.max(0, (this.save.consumableStock.dynamite ?? 0) - this.session.dynamiteUsed),
        energy_drink: Math.max(0, (this.save.consumableStock.energy_drink ?? 0) - this.session.drinksUsed),
      };
      const depth = this.session.depthMeters();
      const prev = this.save.bestDepthByLayer[this.session.layerId] ?? 0;
      if (depth > prev) {
        this.save.bestDepthByLayer = { ...this.save.bestDepthByLayer, [this.session.layerId]: depth };
      }
      this.save.unlockedLayerIds = applyUnlocks(this.save, this.configs, this.session);
      this.unlockedNotice = this.save.unlockedLayerIds.filter((id) => !beforeUnlock.has(id));
    }
    this.settlementApplied = true;
    this.noteTutorial("returned");
    this.analytics.report("run_end", {
      gold: result.gold,
      items: result.lines.length,
      seed: this.session.seed,
    });
    this.persist();
    this.transition(GameStates.Result);
    this.platform.gameplayStop();
    this.sfx.play("treasure");
  }

  private flash(text: string): void {
    this.toast = text;
    this.bump();
  }

  clearToast(): void {
    this.toast = null;
    this.bump();
  }

  private bump(): void {
    this.hudRevision += 1;
    this.emit();
  }

  private transition(to: GameStateId): void {
    if (!canTransition(this.state, to)) {
      throw new Error(`Illegal state transition ${this.state} -> ${to}`);
    }
    this.state = to;
    this.bump();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
