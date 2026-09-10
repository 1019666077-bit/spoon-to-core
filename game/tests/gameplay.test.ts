import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIG_BUNDLE } from "../assets/scripts/data/configs";
import { BackpackGrid } from "../assets/scripts/gameplay/BackpackGrid";
import { DigSession } from "../assets/scripts/gameplay/DigSession";
import { decideDrop, rollDrop } from "../assets/scripts/gameplay/DropTable";
import { generateMap, mapsEqual } from "../assets/scripts/gameplay/MapGenerator";
import { getCell, isDiggable } from "../assets/scripts/gameplay/MapTypes";
import { hasPathToBottom } from "../assets/scripts/gameplay/pathfinding";
import { settleRun } from "../assets/scripts/gameplay/Settlement";
import { rotateShape, shapeCells } from "../assets/scripts/gameplay/shapes";
import { advanceTutorial, chineseCharCount, createTutorial, TUTORIAL_STEPS } from "../assets/scripts/gameplay/Tutorial";
import { buyBackpack, buyStamina, buyTool, currentTool, staminaMax } from "../assets/scripts/gameplay/Upgrades";
import { SeededRandom } from "../assets/scripts/domain/SeededRandom";
import { createDefaultSave } from "../assets/scripts/save/SaveSchema";

function session(seed = 10001, layer = "backyard", firstRun = true): DigSession {
  const save = createDefaultSave(1);
  return new DigSession({
    configs: CONFIG_BUNDLE,
    seed,
    layerId: layer,
    tool: currentTool(save, CONFIG_BUNDLE),
    staminaMax: staminaMax(save, CONFIG_BUNDLE),
    backpack: { cols: 3, rows: 4 },
    firstRun,
    dynamite: 1,
    drinks: 1,
    runId: `t-${seed}`,
  });
}

describe("map generation", () => {
  it("replays the same map for the same seed and always has a path down", () => {
    const a = generateMap({ configs: CONFIG_BUNDLE, layerId: "backyard", seed: 20260908, firstRun: true });
    const b = generateMap({ configs: CONFIG_BUNDLE, layerId: "backyard", seed: 20260908, firstRun: true });
    assert.equal(mapsEqual(a, b), true);
    assert.equal(hasPathToBottom(a), true);
    const c = generateMap({ configs: CONFIG_BUNDLE, layerId: "backyard", seed: 9, firstRun: true });
    assert.equal(mapsEqual(a, c), false);
  });

  it("builds five layers from config", () => {
    for (const layer of CONFIG_BUNDLE.layers) {
      const map = generateMap({ configs: CONFIG_BUNDLE, layerId: layer.id, seed: 44, firstRun: false });
      assert.equal(map.layerId, layer.id);
      assert.equal(hasPathToBottom(map), true);
      assert.equal(map.width, CONFIG_BUNDLE.rules.mapWidth);
    }
  });
});

describe("dig session", () => {
  it("breaks an adjacent soft block and can walk into the hole", () => {
    const dig = session(7);
    const x = dig.playerX;
    const y = dig.playerY + 1;
    const before = getCell(dig.map, x, y);
    assert.ok(before);
    dig.pointerDown(x, y);
    dig.pointerUp();
    const after = getCell(dig.map, x, y)!;
    if (before!.hp <= 1) {
      assert.equal(after.blockId, null);
      assert.equal(dig.playerX, x);
      assert.equal(dig.playerY, y);
    } else {
      assert.ok(after.hp < before!.hp || after.blockId === null);
    }
    assert.ok(dig.stamina < dig.maxStamina);
  });

  it("same seed produces the same hit/crit sequence", () => {
    const a = session(4242, "backyard", false);
    const b = session(4242, "backyard", false);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const ax = a.playerX;
      const ay = Math.min(a.map.height - 1, a.playerY + 1);
      const bx = b.playerX;
      const by = Math.min(b.map.height - 1, b.playerY + 1);
      a.pointerDown(ax, ay);
      a.pointerUp();
      b.pointerDown(bx, by);
      b.pointerUp();
      seqA.push(a.lastHit?.damage ?? -1);
      seqB.push(b.lastHit?.damage ?? -1);
      assert.equal(a.playerX, b.playerX);
      assert.equal(a.playerY, b.playerY);
    }
    assert.deepEqual(seqA, seqB);
  });

  it("does not dig a non-adjacent cell", () => {
    const dig = session(3);
    const ok = dig.pointerDown(0, dig.map.height - 1);
    assert.equal(ok, false);
  });
});

describe("backpack", () => {
  it("auto-places, rotates, and rejects a fill when full", () => {
    const bag = new BackpackGrid(3, 2);
    const coin = CONFIG_BUNDLE.treasures.find((t) => t.id === "rusty_coin")!;
    const phone = CONFIG_BUNDLE.treasures.find((t) => t.id === "dead_phone")!;
    assert.equal(bag.autoPlace(coin).ok, true);
    const placed = bag.autoPlace(phone);
    assert.equal(placed.ok, true);
    if (placed.ok) {
      const rotated = bag.rotate(placed.item.instanceId, phone);
      assert.equal(rotated, true);
    }
    while (bag.autoPlace(coin).ok) {
      /* fill remaining cells */
    }
    const overflow = bag.autoPlace(coin);
    assert.equal(overflow.ok, false);
  });
});

describe("drops settlement upgrades tutorial", () => {
  it("forces the first-run treasure after the time gate", () => {
    const decision = decideDrop(
      {
        elapsed: CONFIG_BUNDLE.rules.firstTreasureSeconds,
        treasuresFound: 0,
        rareFound: 0,
        isFirstRun: true,
        secondsSinceLastDrop: 99,
        layerId: "backyard",
      },
      CONFIG_BUNDLE.rules,
    );
    assert.equal(decision.kind, "treasure");
    assert.equal(decision.forced, true);
    const rng = new SeededRandom(1);
    const drop = rollDrop({
      elapsed: CONFIG_BUNDLE.rules.firstTreasureSeconds,
      treasuresFound: 0,
      rareFound: 0,
      isFirstRun: true,
      secondsSinceLastDrop: 99,
      layerId: "backyard",
      rng,
      configs: CONFIG_BUNDLE,
    });
    assert.ok(drop);
    assert.equal(drop?.forced, true);
    assert.equal(drop?.treasure.id, "rusty_coin");
  });

  it("settles first-find bonus and first-run gold floor", () => {
    const coin = CONFIG_BUNDLE.treasures.find((t) => t.id === "rusty_coin")!;
    const result = settleRun({
      runId: "r1",
      items: [
        {
          instanceId: "it-1",
          treasureId: coin.id,
          rotation: 0,
          x: 0,
          y: 0,
          insured: false,
          quality: "normal",
        },
      ],
      catalog: {},
      configs: CONFIG_BUNDLE,
      isFirstRun: true,
      alreadySettled: false,
      now: 10,
    });
    assert.equal(result.skipped, false);
    assert.ok(result.lines[0]!.firstFind);
    assert.ok(result.gold >= CONFIG_BUNDLE.rules.firstRunMinGold);
    assert.ok(result.catalog[coin.id]);
    const again = settleRun({ ...result, runId: "r1", items: [], alreadySettled: true, catalog: result.catalog, configs: CONFIG_BUNDLE, isFirstRun: true, now: 11 });
    assert.equal(again.skipped, true);
    assert.equal(again.gold, 0);
  });

  it("buys tool/stamina/backpack with gold and rejects poor players", () => {
    let save = createDefaultSave(1);
    save.gold = 10;
    const poor = buyTool(save, CONFIG_BUNDLE);
    assert.equal(poor.ok, false);
    save.gold = 10000;
    const tool = buyTool(save, CONFIG_BUNDLE);
    assert.equal(tool.ok, true);
    if (tool.ok) {
      save = tool.save;
      assert.equal(save.upgrades.toolId, "hearth_shovel");
      assert.equal(save.toolForm, "shovel");
    }
    const stam = buyStamina(save, CONFIG_BUNDLE);
    assert.equal(stam.ok, true);
    const bag = buyBackpack(save, CONFIG_BUNDLE);
    assert.equal(bag.ok, true);
  });

  it("advances tutorial only on the matching event and keeps copy short", () => {
    let state = createTutorial();
    state = advanceTutorial(state, "treasure_got");
    assert.equal(state.stepIndex, 0);
    state = advanceTutorial(state, "block_broken");
    assert.equal(state.stepIndex, 1);
    for (const step of TUTORIAL_STEPS) {
      assert.ok(chineseCharCount(step.text) <= CONFIG_BUNDLE.rules.tutorialTextMaxChars);
    }
  });

  it("lost city gates are not diggable without runes", () => {
    const dig = session(88, "lost_city", false);
    let gated = false;
    for (let y = 0; y < dig.map.height; y += 1) {
      for (let x = 0; x < dig.map.width; x += 1) {
        const cell = getCell(dig.map, x, y)!;
        if ((cell.flags & 2) !== 0 && (cell.flags & 1) !== 0) {
          assert.equal(isDiggable(cell, 0), false);
          gated = true;
        }
      }
    }
    assert.equal(gated, true);
  });
});
