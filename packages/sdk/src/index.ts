import { SDK_URL } from "./constants";

export function createPhantom() {
  const container = document.head || document.documentElement;
  const scriptTag = document.createElement("script");
  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", SDK_URL);
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);
}
