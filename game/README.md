# Spoon to the Core — Cocos Creator 3.8.8 project

This folder is the **official game**. Open it with **Cocos Creator 3.8.8**.

The Grok web preview mounts the same `domain` / `save` / `platform` modules so the title screen can be clicked without the editor. Do not treat that React shell as the shipping runtime.

## Open

1. Install Cocos Creator 3.8.8.
2. Dashboard → Open → this `game/` directory (`package.json` + `assets/` are the project flags).
3. Open `assets/scenes/boot.scene`. Creator will generate missing `.meta` UUIDs on first import.
4. Preview. `GameBootstrap` builds Canvas / title UI in code.

## Tests (no editor)

From this folder (Node 22+, tsx):

```text
npx tsx --test tests/*.test.ts
```

## Stage 0 scope

Title screen, state machine (`boot | home | digging | result`), seeded RNG, config validation, versioned save. No map, backpack, upgrades, art, audio, or live ads.
