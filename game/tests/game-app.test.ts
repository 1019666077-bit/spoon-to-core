import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootGame } from "../assets/scripts/bootstrap/bootGame";
import { GameStates } from "../assets/scripts/domain/GameState";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";

describe("GameApp stage 0 states", () => {
  it("boots into home, persists a v1 save, and enters an empty digging state", async () => {
    const platform = new WebAdapter();
    const { app, saveErrors } = await bootGame({
      platform,
      configs: CONFIG_BUNDLE,
      now: () => 42,
      seed: 7,
    });
    assert.equal(app.state, GameStates.Home);
    assert.equal(app.save.schemaVersion, 1);
    assert.equal(app.save.bootCount, 1);
    assert.deepEqual(saveErrors, ["missing-save"]);

    app.startDigging();
    assert.equal(app.state, GameStates.Digging);
    assert.equal((platform as WebAdapter).isGameplayActive, true);

    app.returnHomeFromDig();
    assert.equal(app.state, GameStates.Home);
    assert.equal((platform as WebAdapter).isGameplayActive, false);
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
    const rewarded = await platform.showRewardedAd("stage0");
    assert.equal(rewarded.ok, false);
    assert.equal(rewarded.simulated, true);
    const interstitial = await platform.showInterstitial();
    assert.equal(interstitial.ok, false);
    assert.equal(interstitial.reason, "hidden");
  });
});
