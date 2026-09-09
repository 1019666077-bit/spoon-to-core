# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

The Grok web preview mounts the same `domain` / `gameplay` / `save` / `platform` modules so the greybox MVP can be played without the editor. That React shell is a preview host, not the shipping runtime.

## Open

1. Install Cocos Creator 3.8.8.
2. Dashboard → Open → this `game/` directory (`package.json` + `assets/` are the project flags).
3. Open `assets/scenes/boot.scene`.
4. Preview. `GameBootstrap` is bound on Canvas (`770fbmX1JhNkYdCbu1Y8OQw`). `GameView` mounts under `Canvas/TitleHost`.

`boot.scene` is based on the official Creator 3.8.8 `scene-2d.scene` template (`cocos-engine` tag `v3.8.8`).

## Tests (no editor)

From this folder, on a fresh machine:

```text
npm install
npm test
npm run typecheck
```

Dump `CONFIG_BUNDLE` into `assets/config` + `assets/resources/config`:

```text
npm run sync-config
```

## Greybox MVP (stages 1–5)

Playable loop: home → dig a seeded map → pack treasures into a rotatable grid bag → hold return → sell / catalog / upgrades → five underground layers. Color blocks and oscillator SFX only. No live ads or IAP.

Version: `0.5.0-mvp`.
