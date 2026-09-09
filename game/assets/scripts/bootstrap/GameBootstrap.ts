import {
  _decorator,
  Camera,
  Canvas,
  Color,
  Component,
  Node,
  UITransform,
  view,
  ResolutionPolicy,
} from "cc";
import { CONFIG_BUNDLE } from "../data/configs";
import { createPlatform } from "../platform/createPlatform";
import { ThemeConfig } from "../ui/ThemeConfig";
import { TitleView } from "../ui/TitleView";
import { bootGame } from "./bootGame";
import {
  CAMERA_NAME,
  CANVAS_NAME,
  ORTHO_PROJECTION,
  TITLE_HOST_NAME,
  UI_2D_LAYER,
  UI_CAMERA_VISIBILITY,
} from "./StageZeroLayout";

const { ccclass } = _decorator;

@ccclass("GameBootstrap")
export class GameBootstrap extends Component {
  async start(): Promise<void> {
    view.setDesignResolutionSize(
      ThemeConfig.designWidth,
      ThemeConfig.designHeight,
      ResolutionPolicy.SHOW_ALL,
    );

    const canvas = this.requireCanvas();
    this.configureUiCamera(canvas);
    const titleHost = this.requireTitleHost(canvas);

    const platform = createPlatform();
    const { app } = await bootGame({ platform, configs: CONFIG_BUNDLE });
    const title = titleHost.getComponent(TitleView) ?? titleHost.addComponent(TitleView);
    title.bind(app);
  }

  /** Canvas is the unique UI root. GameBootstrap lives on it in boot.scene. */
  private requireCanvas(): Node {
    if (this.node.getComponent(Canvas)) return this.node;
    const child = this.node.getChildByName(CANVAS_NAME);
    if (child?.getComponent(Canvas)) return child;
    const parent = this.node.parent;
    if (parent?.getComponent(Canvas)) return parent;
    throw new Error("boot.scene must contain exactly one Canvas for GameBootstrap");
  }

  private requireTitleHost(canvas: Node): Node {
    let host = canvas.getChildByName(TITLE_HOST_NAME);
    if (!host) {
      host = new Node(TITLE_HOST_NAME);
      host.layer = UI_2D_LAYER;
      const transform = host.addComponent(UITransform);
      transform.setContentSize(ThemeConfig.designWidth, ThemeConfig.designHeight);
      canvas.addChild(host);
    }
    return host;
  }

  private configureUiCamera(canvas: Node): void {
    const cameraNode = canvas.getChildByName(CAMERA_NAME);
    if (!cameraNode) {
      throw new Error("boot.scene Canvas must contain a Camera child");
    }
    const camera = cameraNode.getComponent(Camera);
    if (!camera) {
      throw new Error("boot.scene Camera node must have a cc.Camera");
    }
    camera.clearColor = new Color(22, 17, 12, 255);
    camera.priority = 0;
    camera.projection = ORTHO_PROJECTION;
    camera.visibility = UI_CAMERA_VISIBILITY;
    camera.orthoHeight = ThemeConfig.designHeight / 2;
  }
}
