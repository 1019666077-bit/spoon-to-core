# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

Stage **1.5′** is the digging look: boot lands on the dirt pit with a vector chipped bowl (then a spade after upgrade). Home is a secondary hub. Stage **1′** empire loop is unchanged.

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

## Greybox (stage 1.5′)

- Boot opens `digging`: dirt patches + bowl/shovel silhouette, not the Home button wall.
- Home is a secondary hub (`回中枢` / `回到土面`).
- Dig: click or hold the dirt patches; remaining dirt and cracks are visible; the tool swings on a hit.
- First shovel buy (灶间铲 / 工地铁铲) swaps the silhouette from bowl to spade. Tool id `chipped_bowl` is unchanged.
- 牙孢子伴掘虫 ticks dirt and gold; Stats shows period output and 工作/怠工.
- Layer gate: 继续搜刮 / 下潜 (next layer hardness + loot) / 回中枢.
- 过热铲: short dig surge + cooldown after a shovel or the first rift node.
- Save `schemaVersion: 4` with skill points, relics / shards, crew period, breakthrough CD.

Version: `0.7.1-feel`.
