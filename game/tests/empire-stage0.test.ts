import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootGame } from "../assets/scripts/bootstrap/bootGame";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { canTransition, GameStates } from "../assets/scripts/domain/GameState";
import { clickDirt, createDirtField, scrapeRatio } from "../assets/scripts/gameplay/LayerDirtField";
import { nodeStatus, skillBranches } from "../assets/scripts/gameplay/skillTree";
import { rosterSlots } from "../assets/scripts/gameplay/workers";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";

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

describe("empire stage 0′ dirt field", () => {
  it("subtracts tool power and reports scrape without chaining overflow", () => {
    const field = createDirtField(CONFIG_BUNDLE.layers[0]!);
    assert.equal(field.remaining, CONFIG_BUNDLE.layers[0]!.dirtHp);
    const once = clickDirt(field, 3);
    assert.equal(once.dealt, 3);
    assert.equal(once.field.remaining, field.remaining - 3);
    assert.equal(once.emptied, false);
    assert.ok(scrapeRatio(once.field) > 0);
    const empty = clickDirt({ ...once.field, remaining: 2 }, 9);
    assert.equal(empty.dealt, 2);
    assert.equal(empty.field.remaining, 0);
    assert.equal(empty.emptied, true);
  });
});

describe("empire stage 0′ configs", () => {
  it("starts the tool table on a bowl and keeps four skill branches", () => {
    assert.equal(CONFIG_BUNDLE.tools[0]?.id, "chipped_bowl");
    assert.equal(CONFIG_BUNDLE.tools[0]?.form, "bowl");
    assert.equal(CONFIG_BUNDLE.tools[1]?.form, "shovel");
    assert.ok(CONFIG_BUNDLE.skillNodes.length >= 40);
    assert.ok(skillBranches(CONFIG_BUNDLE.skillNodes).length >= 4);
    const root = CONFIG_BUNDLE.skillNodes.find((node) => node.id === "ves_rim_hold");
    assert.ok(root);
    assert.equal(nodeStatus(root!, []), "available");
    assert.equal(nodeStatus(CONFIG_BUNDLE.skillNodes.find((n) => n.id === "ves_form_oath")!, []), "locked");
    const slots = rosterSlots(CONFIG_BUNDLE, []);
    assert.equal(slots.length, 3);
    assert.equal(slots[0]?.worker?.nameZh, "牙孢子伴掘虫");
    assert.equal(slots.every((slot) => !slot.hired), true);
  });
});

describe("empire stage 0′ state machine", () => {
  it("allows home ↔ digging and digging ↔ layer_choice", () => {
    assert.equal(canTransition(GameStates.Home, GameStates.Digging), true);
    assert.equal(canTransition(GameStates.Digging, GameStates.Home), true);
    assert.equal(canTransition(GameStates.Digging, GameStates.LayerChoice), true);
    assert.equal(canTransition(GameStates.LayerChoice, GameStates.Digging), true);
    assert.equal(canTransition(GameStates.LayerChoice, GameStates.Home), true);
    assert.equal(canTransition(GameStates.Home, GameStates.LayerChoice), false);
    assert.equal(canTransition(GameStates.LayerChoice, GameStates.Result), false);
  });

  it("boots into digging with a bowl, and Home is only a secondary hub", async () => {
    const app = await boot(21);
    assert.equal(app.state, GameStates.Digging);
    assert.equal(app.tool.form, "bowl");
    assert.equal(app.save.toolForm, "bowl");
    assert.ok(app.dirtField);
    assert.equal(app.dirtField?.layerId, "backyard");
    assert.equal(app.tool.nameZh, "开裂饭碗");
    const before = app.dirtField!.remaining;
    assert.equal(app.clickDirtPatch(), true);
    assert.equal(app.dirtField!.remaining, before - app.tool.power);
    app.enterLayerChoice();
    assert.equal(app.state, GameStates.LayerChoice);
    app.returnHomeFromLayer();
    assert.equal(app.state, GameStates.Home);
    assert.equal(app.dirtField, null);
  });

  it("opens the layer gate when the dirt patch is emptied", async () => {
    const app = await boot(8);
    assert.ok(app.dirtField);
    app.dirtField = { ...app.dirtField, remaining: 1 };
    assert.equal(app.clickDirtPatch(), true);
    assert.equal(app.state, GameStates.LayerChoice);
    app.continueScavenge();
    assert.equal(app.state, GameStates.Digging);
    assert.ok((app.dirtField?.remaining ?? 0) > 0);
  });
});
