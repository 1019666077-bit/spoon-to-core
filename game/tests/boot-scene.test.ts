import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CAMERA_NAME,
  CANVAS_NAME,
  GAME_BOOTSTRAP_COMPILED_ID,
  GAME_BOOTSTRAP_SCRIPT_UUID,
  TITLE_HOST_NAME,
} from "../assets/scripts/bootstrap/StageZeroLayout";
import { compressUuid, decompressUuid } from "./helpers/cocos-uuid";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenePath = join(root, "assets/scenes/boot.scene");
const metaPath = join(root, "assets/scripts/bootstrap/GameBootstrap.ts.meta");

type SceneObj = {
  __type__?: string;
  _name?: string;
  node?: { __id__: number };
  _parent?: { __id__: number } | null;
  _children?: { __id__: number }[];
  _components?: { __id__: number }[];
  _cameraComponent?: { __id__: number };
  uuid?: string;
};

describe("boot.scene Creator 3.8.8 binding", () => {
  const scene = JSON.parse(readFileSync(scenePath, "utf8")) as SceneObj[];
  const scriptMeta = JSON.parse(readFileSync(metaPath, "utf8")) as { uuid: string };

  it("compresses GameBootstrap.ts.meta uuid to the compiled class id", () => {
    assert.equal(scriptMeta.uuid, GAME_BOOTSTRAP_SCRIPT_UUID);
    assert.equal(compressUuid(scriptMeta.uuid), GAME_BOOTSTRAP_COMPILED_ID);
    assert.equal(decompressUuid(GAME_BOOTSTRAP_COMPILED_ID), GAME_BOOTSTRAP_SCRIPT_UUID);
  });

  it("binds GameBootstrap with the compiled class id, not the raw uuid", () => {
    const raw = readFileSync(scenePath, "utf8");
    assert.equal(raw.includes(GAME_BOOTSTRAP_SCRIPT_UUID), false);
    const bound = scene.filter((obj) => obj.__type__ === GAME_BOOTSTRAP_COMPILED_ID);
    assert.equal(bound.length, 1);
    assert.equal(bound[0]?.node?.__id__, 2);
  });

  it("has exactly one Canvas, one UI Camera, and TitleHost under Canvas", () => {
    const canvasNodes = scene.filter((obj) => obj.__type__ === "cc.Node" && obj._name === CANVAS_NAME);
    const cameraNodes = scene.filter((obj) => obj.__type__ === "cc.Node" && obj._name === CAMERA_NAME);
    const titleHosts = scene.filter((obj) => obj.__type__ === "cc.Node" && obj._name === TITLE_HOST_NAME);
    const canvasComponents = scene.filter((obj) => obj.__type__ === "cc.Canvas");
    const cameraComponents = scene.filter((obj) => obj.__type__ === "cc.Camera");

    assert.equal(canvasNodes.length, 1);
    assert.equal(cameraNodes.length, 1);
    assert.equal(titleHosts.length, 1);
    assert.equal(canvasComponents.length, 1);
    assert.equal(cameraComponents.length, 1);

    const canvasIndex = scene.indexOf(canvasNodes[0]!);
    const cameraIndex = scene.indexOf(cameraNodes[0]!);
    const hostIndex = scene.indexOf(titleHosts[0]!);

    assert.equal(cameraNodes[0]?._parent?.__id__, canvasIndex);
    assert.equal(titleHosts[0]?._parent?.__id__, canvasIndex);
    assert.equal(canvasNodes[0]?._parent?.__id__, 1);

    const childIds = (canvasNodes[0]?._children ?? []).map((c) => c.__id__);
    assert.ok(childIds.includes(cameraIndex));
    assert.ok(childIds.includes(hostIndex));

    const cameraCompIndex = scene.indexOf(cameraComponents[0]!);
    assert.equal(canvasComponents[0]?._cameraComponent?.__id__, cameraCompIndex);
    assert.equal(cameraComponents[0]?.node?.__id__, cameraIndex);
  });

  it("keeps GameBootstrap on the Canvas node so TitleView mounts under TitleHost", () => {
    const bootstrap = scene.find((obj) => obj.__type__ === GAME_BOOTSTRAP_COMPILED_ID);
    const canvas = scene.find((obj) => obj.__type__ === "cc.Node" && obj._name === CANVAS_NAME);
    assert.ok(bootstrap);
    assert.ok(canvas);
    assert.equal(bootstrap?.node?.__id__, scene.indexOf(canvas!));
    const src = readFileSync(join(root, "assets/scripts/bootstrap/GameBootstrap.ts"), "utf8");
    assert.match(src, /requireCanvas/);
    assert.match(src, /requireTitleHost/);
    assert.equal(src.includes('this.node.getChildByName("TitleHost") ?? this.node'), false);
  });
});
