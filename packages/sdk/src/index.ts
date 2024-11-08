import { SDK_URL } from "./constants.js";

type CreatePhantomConfig = Partial<{
  zIndex: number
}>

export function createPhantom(config: CreatePhantomConfig = {}) {
  const container = document.head || document.documentElement;
  const scriptTag = document.createElement("script");

  const sdkURL = new URL(SDK_URL);
  if (config.zIndex) sdkURL.searchParams.append("zIndex", config.zIndex.toString())

  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", SDK_URL);
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);
}
