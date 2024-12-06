import { SDK_URL } from "./constants.js";

export enum Position {
  bottomRight = "bottom-right",
  bottomLeft = "bottom-left",
  topRight = "top-right",
  topLeft = "top-left",
}

export type CreatePhantomConfig = Partial<{
  zIndex: number;
  hideLauncherBeforeOnboarded: boolean;
  colorScheme: string;
  paddingBottom: number;
  paddingRight: number;
  paddingTop: number;
  paddingLeft: number;
  position: Position;
}>;

export function createPhantom(config: CreatePhantomConfig = {}) {
  const container = document.head || document.documentElement;
  const scriptTag = document.createElement("script");

  const sdkURL = new URL(SDK_URL);
  if (config.zIndex)
    sdkURL.searchParams.append("zIndex", config.zIndex.toString());
  if (config.hideLauncherBeforeOnboarded)
    sdkURL.searchParams.append(
      "hideLauncherBeforeOnboarded",
      config.hideLauncherBeforeOnboarded.toString(),
    );
  if (config.colorScheme)
    sdkURL.searchParams.append("colorScheme", config.colorScheme.toString());
  if (config.paddingBottom)
    sdkURL.searchParams.append(
      "paddingBottom",
      config.paddingBottom.toString(),
    );
  if (config.paddingRight)
    sdkURL.searchParams.append("paddingRight", config.paddingRight.toString());

  if (config.paddingTop)
    sdkURL.searchParams.append("paddingTop", config.paddingTop.toString());
  if (config.paddingLeft)
    sdkURL.searchParams.append("paddingLeft", config.paddingLeft.toString());
  if (config.position)
    sdkURL.searchParams.append("position", config.position.toString());

  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", sdkURL.toString());
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);
}
