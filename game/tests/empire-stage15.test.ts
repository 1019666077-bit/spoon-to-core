import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootGame } from "../assets/scripts/bootstrap/bootGame";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { GameStates } from "../assets/scripts/domain/GameState";
import { GAME_VERSION } from "../assets/scripts/domain/version";
import { createDirtField } from "../assets/scripts/gameplay/LayerDirtField";
import { BOWL_TOOL_ID } from "../assets/scripts/gameplay/toolFeel";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";
import {
  createDigFeel,
  DIRT_PATCH_COLS,
  DIRT_PATCH_ROWS,
  dirtPatches,
  dirtProgress01,
  formLabelZh,
  hasBowlCavity,
  hasBowlCrack,
  hasShovelBlade,
  noteDirtChange,
  restPose,
  swingPose,
  tickDigFeel,
  toolDrawCommands,
  toolSilhouette,
} from "../assets/scripts/ui/digFeel";

async function boot(seed = 13) {
  const platform = new WebAdapter();
  const result = await bootGame({
    platform,
    configs: CONFIG_BUNDLE,
    now: () => 1,
    seed,
  });
  return result.app;
}

describe("stage 1.5′ boot into digging", () => {
  it("opens on digging with chipped_bowl form, not the Home hub", async () => {
    const app = await boot(21);
    assert.equal(app.state, GameStates.Digging);
    assert.equal(app.tool.id, BOWL_TOOL_ID);
    assert.equal(app.tool.form, "bowl");
    assert.equal(app.save.toolForm, "bowl");
    assert.equal(app.save.upgrades.toolId, "chipped_bowl");
    assert.ok(app.dirtField);
    assert.equal(formLabelZh(app.tool.form), "碗");
    assert.equal(toolSilhouette(app.tool.form), "bowl");
    app.leaveDigForHome();
    assert.equal(app.state, GameStates.Home);
    app.startDigging();
    assert.equal(app.state, GameStates.Digging);
  });

  it("keeps the 碗→铲 ids after a shovel buy so the silhouette can swap", async () => {
    const app = await boot(4);
    app.save.gold = 200;
    assert.equal(app.buy("tool"), true);
    assert.equal(app.save.upgrades.toolId, "hearth_shovel");
    assert.equal(app.save.toolForm, "shovel");
    assert.equal(app.tool.form, "shovel");
    assert.equal(toolSilhouette(app.tool.form), "shovel");
    assert.equal(formLabelZh(app.tool.form), "铲");
    assert.equal(app.tool.id !== BOWL_TOOL_ID, true);
    assert.equal(CONFIG_BUNDLE.tools[0]?.id, "chipped_bowl");
  });
});

describe("stage 1.5′ dirt patches and bowl/shovel greybox", () => {
  it("turns remaining dirt into a patch grid with a dug frontier", () => {
    const layer = CONFIG_BUNDLE.layers[0]!;
    const full = createDirtField(layer, 0);
    const all = dirtPatches(full);
    assert.equal(all.length, DIRT_PATCH_COLS * DIRT_PATCH_ROWS);
    assert.equal(all.every((p) => p.intact), true);
    assert.equal(dirtProgress01(full), 1);
    const empty = createDirtField(layer, 1);
    const none = dirtPatches(empty);
    assert.equal(none.every((p) => !p.intact), true);
    const mid = { ...full, remaining: Math.floor(full.max / 2), scrape: 0.5 };
    const mixed = dirtPatches(mid, 0);
    assert.ok(mixed.some((p) => p.intact));
    assert.ok(mixed.some((p) => !p.intact));
    assert.ok(mixed.some((p) => p.crack > 0));
  });

  it("draws a chipped bowl cavity + crack, then a shovel blade after upgrade", () => {
    const bowl = toolDrawCommands("bowl", 0);
    assert.equal(hasBowlCavity(bowl), true);
    assert.equal(hasBowlCrack(bowl), true);
    const flashed = toolDrawCommands("bowl", 1);
    const restCrack = bowl.find((c) => c.kind === "stroke" && c.points[0] && c.points[0].x > 20);
    const hotCrack = flashed.find((c) => c.kind === "stroke" && c.points[0] && c.points[0].x > 20);
    assert.ok(restCrack && restCrack.kind === "stroke");
    assert.ok(hotCrack && hotCrack.kind === "stroke");
    assert.notEqual(hotCrack.color, restCrack.color);
    const shovel = toolDrawCommands("shovel", 0);
    assert.equal(hasShovelBlade(shovel), true);
    assert.equal(hasBowlCavity(shovel), false);
  });

  it("swings and flashes only after the dirt actually loses remaining", () => {
    const idle = createDigFeel();
    const armed = noteDirtChange(idle, 0, 40, 40);
    assert.equal(armed.swingT, 0);
    const hit = noteDirtChange(armed, 1, 39, 40);
    assert.ok(hit.swingT > 0);
    assert.ok(hit.flashT > 0);
    assert.ok(hit.hitIndex >= 0);
    const mid = swingPose(hit.swingT * 0.5, hit.flashT, "bowl");
    assert.ok(mid.rotationDeg > restPose().rotationDeg);
    assert.ok(mid.crackFlash > 0);
    const later = tickDigFeel(hit, 1);
    assert.equal(later.swingT, 0);
    assert.equal(later.flashT, 0);
  });
});

describe("stage 1.5′ version", () => {
  it("bumps the feel build", () => {
    assert.match(GAME_VERSION, /0\.7\.1-feel/);
  });
});
