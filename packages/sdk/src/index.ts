import { SDK_URL } from "./constants.js";

export type CreatePhantomConfig = Partial<{
  zIndex: number;
  hideLauncherBeforeOnboarded: boolean;
  colorScheme: string;
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

  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", SDK_URL);
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);
}
