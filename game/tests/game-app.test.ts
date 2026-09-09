import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootGame } from "../assets/scripts/bootstrap/bootGame";
import { GameStates } from "../assets/scripts/domain/GameState";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { mapsEqual } from "../assets/scripts/gameplay/MapGenerator";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";
import { SAVE_SCHEMA_VERSION } from "../assets/scripts/save/SaveSchema";

async function bootWithSeed(seed: number, now = 1) {
  const platform = new WebAdapter();
  const result = await bootGame({
    platform,
    configs: CONFIG_BUNDLE,
    now: () => now,
    seed,
  });
  return { platform, ...result };
}

function takeSequence(app: { rng: { next(): number } }, n: number): number[] {
  return Array.from({ length: n }, () => app.rng.next());
}

describe("GameApp states", () => {
  it("boots into home, persists a current-schema save, and enters digging", async () => {
    const { app, platform, saveErrors } = await bootWithSeed(7, 42);
    assert.equal(app.state, GameStates.Home);
    assert.equal(app.save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(app.save.bootCount, 1);
    assert.deepEqual(saveErrors, ["missing-save"]);

    app.startDigging();
    assert.equal(app.state, GameStates.Digging);
    assert.equal(app.rng.seed, 7);
    assert.equal(app.runSeed, 7);
    assert.ok(app.session);
    assert.equal(app.session?.map.width, CONFIG_BUNDLE.rules.mapWidth);
    assert.equal(platform.isGameplayActive, true);
  });

  it("second boot increments bootCount from the persisted save", async () => {
    const platform = new WebAdapter();
    await bootGame({ platform, configs: CONFIG_BUNDLE, now: () => 1, seed: 1 });
    const second = await bootGame({ platform, configs: CONFIG_BUNDLE, now: () => 2, seed: 1 });
    assert.equal(second.app.save.bootCount, 2);
    assert.equal(second.app.state, GameStates.Home);
  });

  it("WebAdapter ads return an explicit simulated failure, never a silent success", async () => {
    const platform = new WebAdapter();
    await platform.initialize();
    const rewarded = await platform.showRewardedAd("mvp");
    assert.equal(rewarded.ok, false);
    assert.equal(rewarded.simulated, true);
    const interstitial = await platform.showInterstitial();
    assert.equal(interstitial.ok, false);
    assert.equal(interstitial.reason, "hidden");
  });

  it("Home → Digging → Result → Home is operable", async () => {
    const { app } = await bootWithSeed(11);
    const states: string[] = [app.state];
    app.startDigging();
    states.push(app.state);
    app.returnFromDig();
    states.push(app.state);
    app.acknowledgeResult();
    states.push(app.state);
    app.startDigging();
    states.push(app.state);
    app.returnFromDig();
    states.push(app.state);
    app.acknowledgeResult();
    states.push(app.state);
    assert.deepEqual(states, [
      GameStates.Home,
      GameStates.Digging,
      GameStates.Result,
      GameStates.Home,
      GameStates.Digging,
      GameStates.Result,
      GameStates.Home,
    ]);
  });
});

describe("GameApp seed replay", () => {
  it("keeps the boot-injected seed when startDigging has no argument", async () => {
    const { app } = await bootWithSeed(20260908);
    assert.equal(app.injectedSeed, 20260908);
    app.startDigging();
    assert.equal(app.rng.seed, 20260908);
    assert.equal(app.session?.seed, 20260908);
    app.returnFromDig();
    app.acknowledgeResult();
    app.startDigging();
    assert.equal(app.rng.seed, 20260908);
    assert.equal(app.session?.seed, 20260908);
  });

  it("lets an explicit startDigging seed override the injected one", async () => {
    const { app } = await bootWithSeed(1);
    app.startDigging(99);
    assert.equal(app.rng.seed, 99);
    assert.equal(app.session?.seed, 99);
  });

  it("replays the same digging sequence for the same seed", async () => {
    const first = await bootWithSeed(20260908);
    first.app.startDigging();
    const a = takeSequence(first.app, 32);

    const second = await bootWithSeed(20260908);
    second.app.startDigging();
    const b = takeSequence(second.app, 32);
    assert.deepEqual(a, b);
    assert.ok(first.app.session && second.app.session);
    assert.equal(mapsEqual(first.app.session.map, second.app.session.map), true);

    const other = await bootWithSeed(20260909);
    other.app.startDigging();
    const c = takeSequence(other.app, 32);
    assert.notDeepEqual(a, c);
  });

  it("does not roll a fresh seed that would discard the injected value", async () => {
    const { app } = await bootWithSeed(7);
    const before = app.rng.seed;
    app.startDigging();
    assert.equal(app.rng.seed, before);
    assert.equal(app.rng.seed, 7);
    assert.equal(app.session?.seed, 7);
  });
});

describe("GameApp run economy", () => {
  it("settles gold and catalog, then first-run subsidy if needed", async () => {
    const { app } = await bootWithSeed(10001);
    app.startDigging();
    assert.equal(app.session?.firstRun, true);
    app.returnFromDig();
    assert.equal(app.state, GameStates.Result);
    assert.ok(app.lastSettlement);
    assert.equal(app.lastSettlement?.skipped, false);
    assert.ok((app.lastSettlement?.gold ?? 0) >= CONFIG_BUNDLE.rules.firstRunMinGold);
    assert.equal(app.save.gold, app.lastSettlement?.gold);
  });

  it("rejects a locked layer and buys a backpack when gold allows", async () => {
    const { app } = await bootWithSeed(3);
    app.save.gold = 500;
    assert.equal(app.selectLayer("lost_city"), false);
    assert.equal(app.save.selectedLayerId, "backyard");
    assert.equal(app.buy("backpack"), true);
    assert.equal(app.save.upgrades.backpackLevel, 1);
    assert.equal(app.bagSize.cols, 4);
  });
});
