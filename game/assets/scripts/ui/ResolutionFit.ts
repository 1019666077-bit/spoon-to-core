import { _decorator, Component, ResolutionPolicy, view } from "cc";
import { ThemeConfig } from "./ThemeConfig";

const { ccclass } = _decorator;

@ccclass("ResolutionFit")
export class ResolutionFit extends Component {
  start(): void {
    view.setDesignResolutionSize(
      ThemeConfig.designWidth,
      ThemeConfig.designHeight,
      ResolutionPolicy.SHOW_ALL,
    );
  }
}
