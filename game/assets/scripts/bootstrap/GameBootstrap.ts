import {
  _decorator,
  Camera,
  Canvas,
  Color,
  Component,
  Node,
  UITransform,
  Widget,
  view,
  ResolutionPolicy,
} from "cc";
import { CONFIG_BUNDLE } from "../data/configs";
import { createPlatform } from "../platform/createPlatform";
import { ThemeConfig } from "../ui/ThemeConfig";
import { TitleView } from "../ui/TitleView";
import { bootGame } from "./bootGame";

const { ccclass } = _decorator;

@ccclass("GameBootstrap")
export class GameBootstrap extends Component {
  async start(): Promise<void> {
    view.setDesignResolutionSize(
      ThemeConfig.designWidth,
      ThemeConfig.designHeight,
      ResolutionPolicy.SHOW_ALL,
    );
    this.ensureCanvas();
    const platform = createPlatform();
    const { app } = await bootGame({ platform, configs: CONFIG_BUNDLE });
    const viewNode = this.node.getChildByName("TitleHost") ?? this.node;
    const title = viewNode.getComponent(TitleView) ?? viewNode.addComponent(TitleView);
    title.bind(app);
  }

  private ensureCanvas(): void {
    let canvasNode = this.node.getChildByName("Canvas");
    if (!canvasNode) {
      canvasNode = new Node("Canvas");
      this.node.addChild(canvasNode);
    }
    if (!canvasNode.getComponent(UITransform)) {
      const transform = canvasNode.addComponent(UITransform);
      transform.setContentSize(ThemeConfig.designWidth, ThemeConfig.designHeight);
    }
    if (!canvasNode.getComponent(Canvas)) {
      canvasNode.addComponent(Canvas);
    }
    const widget = canvasNode.getComponent(Widget) ?? canvasNode.addComponent(Widget);
    widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
    widget.top = widget.bottom = widget.left = widget.right = 0;
    widget.updateAlignment();

    let cameraNode = canvasNode.getChildByName("Camera");
    if (!cameraNode) {
      cameraNode = new Node("Camera");
      canvasNode.addChild(cameraNode);
    }
    const camera = cameraNode.getComponent(Camera) ?? cameraNode.addComponent(Camera);
    camera.clearColor = new Color(22, 17, 12, 255);
    camera.priority = 0;

    if (!canvasNode.getChildByName("TitleHost")) {
      const host = new Node("TitleHost");
      const hostTransform = host.addComponent(UITransform);
      hostTransform.setContentSize(ThemeConfig.designWidth, ThemeConfig.designHeight);
      canvasNode.addChild(host);
    }
  }
}
