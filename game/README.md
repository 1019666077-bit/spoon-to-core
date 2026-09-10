# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

Stage **0′** is the click-dirt empire shell: Home hub, a clickable dirt patch, starting **bowl**, worker / skill-tree placeholders, and `layer_choice`. The old grid-dig session is still in the repo for tests, but `GameView` does not use it as the main UI.

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

## Greybox (stage 0′)

- Home: gold, depth, 开始挖土, three crew berths, 根系图谱, 帝国账册.
- Dig: click the dirt color block; HUD shows 开裂饭碗 · 碗.
- Layer gate shell: 继续搜刮 / 下潜 / 回 Home.
- Save `schemaVersion: 3` with roster, skill nodes, tool form, scrape progress.

Version: `0.6.0-empire0`.
