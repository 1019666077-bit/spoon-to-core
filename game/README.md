# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

Stage **1′** is the first playable empire loop: click / hold the dirt patch, bowl → shovel, the Fangspore Diggerling ticks, the skill tree spends points, layer-end descend is real, and 过热铲 is the first breakthrough. The old grid-dig session stays for leftover tests; `GameView` does not use it as the main UI.

## Open

1. Install Cocos Creator 3.8.8.
2. Dashboard → Open → this `game/` directory (`package.json` + `assets/` are the project flags).
3. Open `assets/scenes/boot.scene`.
4. Preview. `GameBootstrap` is bound on Canvas. `GameView` mounts under `Canvas/TitleHost`.

`boot.scene` is based on the official Creator 3.8.8 `scene-2d.scene` template (`cocos-engine` tag `v3.8.8`).

## Tests (no editor)

From this folder:

```text
npm install
npm test
npm run typecheck
```

Dump `CONFIG_BUNDLE` into `assets/config` + `assets/resources/config`:

```text
npm run sync-config
```

## Greybox (stage 1′)

- Home: gold, depth, 开始挖土, 灶间铺, hireable crew berths, 根系图谱, 帝国账册.
- Dig: click or hold the dirt patch; drops mud / gold / oddments; HUD shows the current tool form.
- First shovel buy (灶间铲 / 工地铁铲) changes power and interval.
- 牙孢子伴掘虫 ticks dirt and gold; Stats shows period output and 工作/怠工.
- Layer gate: 继续搜刮 / 下潜 (next layer hardness + loot) / 回 Home.
- 过热铲: short dig surge + cooldown after a shovel or the first rift node.
- Save `schemaVersion: 4` with skill points, relics / shards, crew period, breakthrough CD.

Version: `0.7.0-empire1`.
