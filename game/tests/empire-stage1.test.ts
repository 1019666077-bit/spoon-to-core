import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootGame } from "../assets/scripts/bootstrap/bootGame";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { GameStates } from "../assets/scripts/domain/GameState";
import {
  activateBreakthrough,
  canActivateBreakthrough,
  createBreakthrough,
  isBreakthroughUnlocked,
  OVERHEAT_COOLDOWN_SECONDS,
  OVERHEAT_NAME_ZH,
  OVERHEAT_POWER_MUL,
  OVERHEAT_SURGE_SECONDS,
  surgeMultiplier,
  tickBreakthrough,
} from "../assets/scripts/gameplay/breakthrough";
import { lootForLayer } from "../assets/scripts/gameplay/empireDrops";
import { clickDirt, createDirtField } from "../assets/scripts/gameplay/LayerDirtField";
import { descendTarget, layerHardness, scrapeReached } from "../assets/scripts/gameplay/layerGate";
import { applyRelicChip, RELIC_SLOT_CAP, SHARDS_PER_RELIC } from "../assets/scripts/gameplay/relics";
import {
  canUnlock,
  nodeStatus,
  skillBonuses,
  skillBranches,
  skillPointsFromDirt,
  unlockSkillNode,
} from "../assets/scripts/gameplay/skillTree";
import { bowlToShovelDelta, scoopInterval, scoopPower } from "../assets/scripts/gameplay/toolFeel";
import { hireWorker, tickHiredWorkers } from "../assets/scripts/gameplay/workers";
import { WebAdapter } from "../assets/scripts/platform/WebAdapter";
import { migrateSave } from "../assets/scripts/save/migrations";
import { createDefaultSave, SAVE_SCHEMA_VERSION } from "../assets/scripts/save/SaveSchema";

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

describe("stage 1′ dirt deduction", () => {
  it("subtracts scoop power and does not chain overflow", () => {
    const field = createDirtField(CONFIG_BUNDLE.layers[0]!);
    const once = clickDirt(field, 3);
    assert.equal(once.dealt, 3);
    assert.equal(once.field.remaining, field.remaining - 3);
    const empty = clickDirt({ ...once.field, remaining: 2 }, 9);
    assert.equal(empty.dealt, 2);
    assert.equal(empty.emptied, true);
  });
});

describe("stage 1′ 开裂饭碗 → 灶间铲 attribute jump", () => {
  it("names 开裂饭碗 vs 灶间铲 and records a perceptible power/interval jump", () => {
    const bowl = CONFIG_BUNDLE.tools.find((tool) => tool.id === "chipped_bowl")!;
    const shovel = CONFIG_BUNDLE.tools.find((tool) => tool.id === "hearth_shovel")!;
    const yard = CONFIG_BUNDLE.tools.find((tool) => tool.id === "yard_iron_shovel")!;
    assert.equal(bowl.nameZh, "开裂饭碗");
    assert.equal(bowl.form, "bowl");
    assert.equal(shovel.nameZh, "灶间铲");
    assert.equal(shovel.form, "shovel");
    assert.equal(yard.nameZh, "工地铁铲");
    assert.equal(yard.form, "shovel");
    const delta = bowlToShovelDelta(bowl, shovel);
    assert.ok(delta.powerGain >= 3, `升铲前力量 ${bowl.power}，升铲后 ${shovel.power}，差应 ≥ 3`);
    assert.ok(delta.intervalCut >= 0.2, `升铲前间隔 ${bowl.attackInterval}s，升铲后 ${shovel.attackInterval}s，缩短应 ≥ 0.2s`);
    assert.ok(scoopPower(shovel) > scoopPower(bowl));
    assert.ok(scoopInterval(shovel) < scoopInterval(bowl));
    assert.ok(yard.power > shovel.power);
  });
});

describe("stage 1′ worker tick", () => {
  it("lets 牙孢子伴掘虫 scoop dirt and mint gold on the current layer", () => {
    const worker = CONFIG_BUNDLE.workers[0]!;
    assert.equal(worker.nameZh, "牙孢子伴掘虫");
    const field = createDirtField(CONFIG_BUNDLE.layers[0]!);
    const before = field.remaining;
    const tick = tickHiredWorkers({
      field,
      workers: [worker],
      dt: 2,
      accumulator: 0,
      workerMul: 0,
      goldPerDirt: 2,
    });
    assert.ok(tick.dirtDealt >= 1);
    assert.equal(tick.field.remaining, before - tick.dirtDealt);
    assert.equal(tick.gold, tick.dirtDealt * 2);
    assert.equal(tick.working, true);
    assert.equal(tick.idle, false);
    const idle = tickHiredWorkers({
      field: { ...tick.field, remaining: 0 },
      workers: [worker],
      dt: 1,
      accumulator: 0,
      workerMul: 0,
      goldPerDirt: 2,
    });
    assert.equal(idle.working, false);
    assert.equal(idle.idle, true);
    assert.equal(idle.dirtDealt, 0);
  });
});

describe("stage 1′ skill tree prerequisites and perceptible nodes", () => {
  it("keeps a large tree and lets vessel + crew early nodes change feel", () => {
    assert.ok(CONFIG_BUNDLE.skillNodes.length >= 40);
    assert.ok(skillBranches(CONFIG_BUNDLE.skillNodes).length >= 4);
    const rim = CONFIG_BUNDLE.skillNodes.find((node) => node.id === "ves_rim_hold")!;
    const temper = CONFIG_BUNDLE.skillNodes.find((node) => node.id === "ves_clay_temper")!;
    const berth = CONFIG_BUNDLE.skillNodes.find((node) => node.id === "crw_first_berth")!;
    const hatch = CONFIG_BUNDLE.skillNodes.find((node) => node.id === "crw_spore_hatch")!;
    assert.equal(nodeStatus(rim, []), "available");
    assert.equal(canUnlock(temper, []), false);
    assert.equal(canUnlock(temper, ["ves_rim_hold"]), true);
    assert.equal(canUnlock(hatch, ["crw_first_berth"]), true);
    const afterVessel = skillBonuses(CONFIG_BUNDLE, ["ves_rim_hold", "ves_clay_temper"]);
    assert.ok(afterVessel.digPower >= 2);
    const afterCrew = skillBonuses(CONFIG_BUNDLE, ["crw_first_berth", "crw_spore_hatch"]);
    assert.ok(afterCrew.workerMul >= 1);
    let save = createDefaultSave(1);
    save.skillPoints = 1;
    const poorNext = unlockSkillNode(save, CONFIG_BUNDLE, "ves_clay_temper");
    assert.equal(poorNext.ok, false);
    const first = unlockSkillNode(save, CONFIG_BUNDLE, "ves_rim_hold");
    assert.equal(first.ok, true);
    if (first.ok) {
      first.save.skillPoints = 1;
      const second = unlockSkillNode(first.save, CONFIG_BUNDLE, "ves_clay_temper");
      assert.equal(second.ok, true);
    }
    assert.equal(skillPointsFromDirt(0, 8), 1);
    assert.equal(skillPointsFromDirt(8, 15), 0);
    assert.equal(skillPointsFromDirt(8, 16), 1);
  });
});

describe("stage 1′ layer three-state", () => {
  it("opens the gate at scrape target and descends into a harder drop pool", async () => {
    const backyard = CONFIG_BUNDLE.layers[0]!;
    const city = descendTarget(CONFIG_BUNDLE, "backyard");
    assert.ok(city);
    assert.equal(city!.id, "lost_city");
    assert.ok(layerHardness(city!) > layerHardness(backyard));
    const yardLoot = lootForLayer(CONFIG_BUNDLE, "backyard").map((item) => item.id);
    const cityLoot = lootForLayer(CONFIG_BUNDLE, "lost_city").map((item) => item.id);
    assert.ok(yardLoot.includes("damp_clod"));
    assert.ok(cityLoot.includes("mica_chip"));
    assert.notDeepEqual(yardLoot, cityLoot);

    const app = await boot(8);
    assert.ok(app.dirtField);
    app.dirtField = { ...app.dirtField!, remaining: 1 };
    assert.equal(scrapeReached({ ...app.dirtField!, remaining: 0 }, backyard), true);
    assert.equal(app.clickDirtPatch(), true);
    assert.equal(app.state, GameStates.LayerChoice);
    assert.equal(app.descendLayer(), true);
    assert.equal(app.state, GameStates.Digging);
    assert.equal(app.save.selectedLayerId, "lost_city");
    assert.equal(app.dirtField?.layerId, "lost_city");
    assert.equal(app.dirtField?.max, city!.dirtHp);
    assert.ok(app.save.unlockedLayerIds.includes("lost_city"));
    app.enterLayerChoice();
    app.continueScavenge();
    assert.equal(app.state, GameStates.Digging);
    assert.ok((app.dirtField?.remaining ?? 0) > 0);
    app.enterLayerChoice();
    app.returnHomeFromLayer();
    assert.equal(app.state, GameStates.Home);
  });
});

describe("stage 1′ breakthrough cooldown", () => {
  it("locks 过热铲 behind a shovel or rift node, then runs surge + CD", () => {
    assert.equal(OVERHEAT_NAME_ZH, "过热铲");
    const locked = createDefaultSave(1);
    assert.equal(isBreakthroughUnlocked(locked), false);
    locked.toolForm = "shovel";
    assert.equal(isBreakthroughUnlocked(locked), true);
    let state = createBreakthrough();
    assert.equal(canActivateBreakthrough(state, true), true);
    const surged = activateBreakthrough(state);
    assert.ok(surged);
    assert.equal(surgeMultiplier(surged!), OVERHEAT_POWER_MUL);
    state = tickBreakthrough(surged!, OVERHEAT_SURGE_SECONDS);
    assert.equal(state.surgeRemaining, 0);
    assert.equal(state.cooldownRemaining, OVERHEAT_COOLDOWN_SECONDS);
    assert.equal(activateBreakthrough(state), null);
    state = tickBreakthrough(state, OVERHEAT_COOLDOWN_SECONDS);
    assert.equal(state.cooldownRemaining, 0);
    assert.ok(activateBreakthrough(state));
  });
});

describe("stage 1′ save, shop, hire, hold, relics", () => {
  it("migrates v3 empire saves into schema 4 placeholders", () => {
    const result = migrateSave(
      {
        schemaVersion: 3,
        gold: 40,
        upgrades: { toolId: "hearth_shovel", staminaLevel: 0, backpackLevel: 0, radarLevel: 0 },
        toolForm: "shovel",
        workerRoster: ["spore_digger"],
        unlockedSkillNodeIds: ["ves_rim_hold"],
        scrapeProgress: 0.4,
        selectedLayerId: "backyard",
        unlockedLayerIds: ["backyard"],
      },
      5,
    );
    assert.equal(result.save.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.equal(result.save.toolForm, "shovel");
    assert.deepEqual(result.save.workerRoster, ["spore_digger"]);
    assert.deepEqual(result.save.unlockedSkillNodeIds, ["ves_rim_hold"]);
    assert.equal(result.save.skillPoints, 0);
    assert.equal(result.save.shardPieces, 0);
    assert.ok(result.migrated);
  });

  it("buys 灶间铲, hires 牙孢子伴掘虫, holds to scoop, and persists the outing", async () => {
    const app = await boot(21);
    assert.equal(app.save.schemaVersion, 4);
    assert.equal(CONFIG_BUNDLE.loot.length >= 15, true);
    app.save.gold = 200;
    assert.equal(app.buy("tool"), true);
    assert.equal(app.save.upgrades.toolId, "hearth_shovel");
    assert.equal(app.save.toolForm, "shovel");
    assert.equal(app.tool.nameZh, "灶间铲");
    assert.equal(app.hire("spore_digger"), true);
    assert.deepEqual(app.save.workerRoster, ["spore_digger"]);
    app.save.skillPoints = 2;
    assert.equal(app.unlockSkill("ves_rim_hold"), true);
    assert.equal(app.unlockSkill("crw_first_berth"), true);
    app.startDigging();
    assert.equal(app.tool.form, "shovel");
    const before = app.dirtField!.remaining;
    app.setDirtHeld(true);
    assert.ok((app.dirtField?.remaining ?? 0) < before);
    const mid = app.dirtField!.remaining;
    app.tick(app.scoopIntervalNow);
    assert.ok((app.dirtField?.remaining ?? mid) <= mid);
    app.setDirtHeld(false);
    assert.equal(app.useBreakthrough(), true);
    assert.ok(app.breakthrough.surgeRemaining > 0);
    app.tick(0.5);
    const hired = hireWorker(app.save, CONFIG_BUNDLE, "spore_digger");
    assert.equal(hired.ok, false);
    app.leaveDigForHome();
    assert.equal(app.state, GameStates.Home);
    const again = await bootGame({
      platform: app.platform,
      configs: CONFIG_BUNDLE,
      now: () => 9,
      seed: 21,
    });
    assert.equal(again.app.save.upgrades.toolId, "hearth_shovel");
    assert.deepEqual(again.app.save.workerRoster, ["spore_digger"]);
    assert.ok(again.app.save.unlockedSkillNodeIds.includes("ves_rim_hold"));
    assert.ok(again.app.save.unlockedSkillNodeIds.includes("crw_first_berth"));
  });

  it("fills relic slots from puzzle shards", () => {
    let save = createDefaultSave(1);
    for (let i = 0; i < SHARDS_PER_RELIC; i += 1) save = applyRelicChip(save);
    assert.equal(save.relicSlotsFilled, 1);
    assert.equal(save.shardPieces, 0);
    for (let i = 0; i < SHARDS_PER_RELIC * (RELIC_SLOT_CAP + 1); i += 1) save = applyRelicChip(save);
    assert.equal(save.relicSlotsFilled, RELIC_SLOT_CAP);
  });
});
