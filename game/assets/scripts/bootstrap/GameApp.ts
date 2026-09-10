import { AnalyticsStub } from "../analytics/AnalyticsStub";
import { Sfx } from "../audio/Sfx";
import type { GameConfigs, LayerConfig, ToolConfig } from "../data/types";
import { canTransition, GameStates, type GameStateId } from "../domain/GameState";
import { randomSeed, SeededRandom } from "../domain/SeededRandom";
import {
  activateBreakthrough,
  canActivateBreakthrough,
  createBreakthrough,
  isBreakthroughUnlocked,
  OVERHEAT_NAME_ZH,
  surgeMultiplier,
  tickBreakthrough,
  type BreakthroughState,
} from "../gameplay/breakthrough";
import { DigSession } from "../gameplay/DigSession";
import { goldPerScoop, rollScoopYield } from "../gameplay/empireDrops";
import { descendTarget, scrapeReached } from "../gameplay/layerGate";
import {
  clickDirt,
  createDirtField,
  refillDirt,
  scrapeRatio,
  type DirtField,
} from "../gameplay/LayerDirtField";
import { applyUnlocks, isLayerUnlocked, orderedLayers } from "../gameplay/Layers";
import { applyRelicChip } from "../gameplay/relics";
import { settleRun, type SettlementResult } from "../gameplay/Settlement";
import { skillBonuses, skillPointsFromDirt, unlockSkillNode } from "../gameplay/skillTree";
import { scoopInterval, scoopPower } from "../gameplay/toolFeel";
import {
  hiredWorkers,
  hireWorker,
  rosterSlots,
  tickHiredWorkers,
  type WorkerSlot,
} from "../gameplay/workers";
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
  dirtHeld = false;
  lastScoopLog: string | null = null;
  crewWorking = false;
  crewIdle = false;
  breakthrough: BreakthroughState = createBreakthrough();
  private holdAcc = 0;
  private workerAcc = 0;

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
    this.breakthrough = createBreakthrough(this.save.breakthroughCooldown);
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

  get treeBonuses() {
    return skillBonuses(this.configs, this.save.unlockedSkillNodeIds);
  }

  get scoopPowerNow(): number {
    return scoopPower(this.tool, {
      bonusPower: this.treeBonuses.digPower,
      surgeMul: surgeMultiplier(this.breakthrough),
    });
  }

  get scoopIntervalNow(): number {
    return scoopInterval(this.tool);
  }

  get breakthroughUnlocked(): boolean {
    return isBreakthroughUnlocked(this.save) || this.treeBonuses.unlockBreakthrough;
  }

  get hiredCrew() {
    return hiredWorkers(this.configs, this.save.workerRoster);
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
    this.save.workerPeriodDirt = 0;
    this.save.workerPeriodGold = 0;
    this.dirtHeld = false;
    this.holdAcc = 0;
    this.workerAcc = 0;
    this.crewWorking = false;
    this.crewIdle = this.hiredCrew.length > 0;
    this.lastScoopLog = null;
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
    this.breakthrough = tickBreakthrough(this.breakthrough, dt);
    this.save.breakthroughCooldown = this.breakthrough.cooldownRemaining;
    if (this.state === GameStates.Digging && this.session && !this.dirtField) {
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
    this.advanceEmpire(dt);
  }

  private advanceEmpire(dt: number): void {
    if (this.state !== GameStates.Digging || !this.dirtField) return;
    if (this.dirtHeld) {
      this.holdAcc += Math.max(0, dt);
      const interval = this.scoopIntervalNow;
      while (this.holdAcc >= interval && this.state === GameStates.Digging && this.dirtField) {
        this.holdAcc -= interval;
        if (!this.applyScoop()) break;
      }
    }
    this.tickCrew(dt);
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

  /** Main empire dig: one scoop. Hold-to-dig uses setDirtHeld + tick. */
  clickDirtPatch(): boolean {
    if (this.state !== GameStates.Digging || !this.dirtField) return false;
    this.sfx.unlock();
    return this.applyScoop();
  }

  setDirtHeld(held: boolean): void {
    if (!held) {
      this.dirtHeld = false;
      this.holdAcc = 0;
      return;
    }
    if (this.state !== GameStates.Digging || !this.dirtField) return;
    this.sfx.unlock();
    this.dirtHeld = true;
    this.holdAcc = 0;
    this.applyScoop();
  }

  /** Empire leave: keep scrape, skip backpack settlement. */
  leaveDigForHome(): void {
    if (this.state === GameStates.LayerChoice) {
      this.returnHomeFromLayer();
      return;
    }
    if (this.state !== GameStates.Digging) return;
    this.dirtHeld = false;
    this.persistScrape();
    this.session = null;
    this.dirtField = null;
    this.homePanel = "hub";
    this.transition(GameStates.Home);
    this.platform.gameplayStop();
    this.sfx.play("ui");
    this.persist();
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

  /** Layer gate: switch to the next stratum's hardness and drop pool. */
  descendLayer(): boolean {
    if (this.state !== GameStates.LayerChoice) return false;
    const next = descendTarget(this.configs, this.save.selectedLayerId);
    if (!next) {
      this.flash("已至最深一层");
      this.sfx.play("warn");
      return false;
    }
    this.save.selectedLayerId = next.id;
    if (!this.save.unlockedLayerIds.includes(next.id)) {
      this.save.unlockedLayerIds = [...this.save.unlockedLayerIds, next.id];
    }
    this.save.scrapeProgress = 0;
    this.save.skillPoints += 1;
    const prevBest = this.save.bestDepthByLayer[next.id] ?? 0;
    if (next.depthMin > prevBest) {
      this.save.bestDepthByLayer = { ...this.save.bestDepthByLayer, [next.id]: next.depthMin };
    }
    this.dirtField = createDirtField(next, 0);
    this.dirtHeld = false;
    this.holdAcc = 0;
    this.workerAcc = 0;
    this.crewIdle = this.hiredCrew.length > 0;
    this.flash(`下潜至 ${next.nameZh}`);
    this.transition(GameStates.Digging);
    this.platform.gameplayStart();
    this.sfx.play("ui");
    this.persist();
    return true;
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

  hire(workerId: string): boolean {
    this.sfx.unlock();
    const result = hireWorker(this.save, this.configs, workerId);
    if (!result.ok) {
      this.flash(result.reason === "poor" ? "金币不足" : result.reason === "max" ? "已在编" : "无法雇佣");
      this.sfx.play("warn");
      return false;
    }
    this.save = result.save;
    this.flash(`${this.configs.workers.find((w) => w.id === workerId)?.nameZh ?? "雇工"}已入席`);
    this.sfx.play("shop");
    this.persist();
    this.bump();
    return true;
  }

  unlockSkill(nodeId: string): boolean {
    this.sfx.unlock();
    const result = unlockSkillNode(this.save, this.configs, nodeId);
    if (!result.ok) {
      const reason =
        result.reason === "poor"
          ? "技能点不足"
          : result.reason === "locked"
            ? "前置未点"
            : result.reason === "owned"
              ? "已点亮"
              : "无法点亮";
      this.flash(reason);
      this.sfx.play("warn");
      return false;
    }
    this.save = result.save;
    const node = this.configs.skillNodes.find((item) => item.id === nodeId);
    this.flash(`点亮 ${node?.nameZh ?? nodeId}`);
    this.sfx.play("shop");
    this.persist();
    this.bump();
    return true;
  }

  useBreakthrough(): boolean {
    if (this.state !== GameStates.Digging) {
      this.flash("挖土时才能过热");
      this.sfx.play("warn");
      return false;
    }
    if (!this.breakthroughUnlocked) {
      this.flash("升铲或点破隙后解锁过热铲");
      this.sfx.play("warn");
      return false;
    }
    if (!canActivateBreakthrough(this.breakthrough, true)) {
      const wait = Math.ceil(this.breakthrough.cooldownRemaining);
      this.flash(wait > 0 ? `过热铲冷却 ${wait}s` : "过热铲仍在爆发");
      this.sfx.play("warn");
      return false;
    }
    const next = activateBreakthrough(this.breakthrough);
    if (!next) return false;
    this.breakthrough = next;
    this.flash(`${OVERHEAT_NAME_ZH}！挖掘暴增`);
    this.sfx.play("break");
    this.persist();
    this.bump();
    return true;
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
    this.save.breakthroughCooldown = this.breakthrough.cooldownRemaining;
    return this.saves.write(this.save);
  }

  private applyScoop(): boolean {
    if (this.state !== GameStates.Digging || !this.dirtField) return false;
    const power = this.scoopPowerNow;
    const result = clickDirt(this.dirtField, power);
    this.dirtField = result.field;
    this.save.scrapeProgress = scrapeRatio(result.field);
    this.save.toolForm = this.tool.form;
    if (result.dealt > 0) {
      this.awardDirt(result.dealt);
      const yieldDrop = rollScoopYield(this.rng, this.configs, this.currentLayer);
      this.save.gold += yieldDrop.gold;
      if (yieldDrop.loot?.kind === "relic_chip") {
        this.save = applyRelicChip(this.save);
      }
      this.lastScoopLog = yieldDrop.loot
        ? `+${yieldDrop.gold}金 · ${yieldDrop.loot.nameZh}`
        : `+${yieldDrop.gold}金 · 潮泥`;
      this.sfx.play("hit");
    }
    if (result.emptied || scrapeReached(result.field, this.currentLayer)) {
      this.sfx.play("break");
      this.dirtHeld = false;
      this.enterLayerChoice();
      return true;
    }
    this.persist();
    this.bump();
    return result.dealt > 0;
  }

  private tickCrew(dt: number): void {
    if (this.state !== GameStates.Digging || !this.dirtField) return;
    const crew = this.hiredCrew;
    const tick = tickHiredWorkers({
      field: this.dirtField,
      workers: crew,
      dt,
      accumulator: this.workerAcc,
      workerMul: this.treeBonuses.workerMul,
      goldPerDirt: goldPerScoop(this.currentLayer),
    });
    this.dirtField = tick.field;
    this.workerAcc = tick.accumulator;
    this.crewWorking = tick.working;
    this.crewIdle = tick.idle;
    if (tick.dirtDealt > 0) {
      this.awardDirt(tick.dirtDealt);
      this.save.gold += tick.gold;
      this.save.workerPeriodDirt += tick.dirtDealt;
      this.save.workerPeriodGold += tick.gold;
      this.save.scrapeProgress = scrapeRatio(tick.field);
      this.lastScoopLog = `编制 +${tick.dirtDealt}土 · +${tick.gold}金`;
    }
    if (tick.field.remaining <= 0 || scrapeReached(tick.field, this.currentLayer)) {
      this.dirtHeld = false;
      this.enterLayerChoice();
      return;
    }
    if (tick.dirtDealt > 0) {
      this.persist();
      this.bump();
    }
  }

  private awardDirt(dealt: number): void {
    const before = this.save.lifetimeDirt;
    this.save.lifetimeDirt += dealt;
    this.save.skillPoints += skillPointsFromDirt(before, this.save.lifetimeDirt);
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
