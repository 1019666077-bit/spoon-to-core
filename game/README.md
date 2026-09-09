# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

The Grok web preview mounts the same `domain` / `save` / `platform` modules so the title screen can be clicked without the editor. Do not treat that React shell as the shipping runtime.

## Open

1. Install Cocos Creator 3.8.8.
2. Dashboard → Open → this `game/` directory (`package.json` + `assets/` are the project flags).
3. Open `assets/scenes/boot.scene`.
4. Preview. `GameBootstrap` is bound on Canvas (`770fbmX1JhNkYdCbu1Y8OQw`). Title, buttons and settings live under `Canvas/TitleHost`.

`boot.scene` is based on the official Creator 3.8.8 `scene-2d.scene` template (`cocos-engine` tag `v3.8.8`), not a hand-invented serialization.

## Tests (no editor)

From this folder, on a fresh machine:

```text
npm install
npm test
npm run typecheck
```

## Stage 0 scope

Title screen, state machine (`boot | home | digging | result`), seeded RNG, config validation, versioned save. No map, backpack, upgrades, art, audio, or live ads.
