import {
  PHANTOM_IFRAME_ID,
  PHANTOM_INITIALIZED_EVENT_NAME,
  SDK_URL,
} from "./constants.js";

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
  sdkURL: string;
  element: string;
}>;

export interface Phantom {
  show: () => void;
  hide: () => void;
  buy: (options: { amount?: number; buy: string }) => void;
  swap: (options: { buy: string; sell?: string; amount?: string }) => void;
}

export interface PhantomApp {
  buy: (options: { buy: string; amount?: number }) => void;
  swap: (options: { buy: string; sell?: string; amount?: string }) => void;
}

// Define window.phantom.app type
declare global {
  interface Window {
    phantom: {
      app: PhantomApp;
    };
  }
}

export async function createPhantom(
  config: CreatePhantomConfig = {}
): Promise<Phantom> {
  const container = document.head ?? document.documentElement;
  const scriptTag = document.createElement("script");

  const sdkURL = new URL(config.sdkURL ?? SDK_URL);
  if ("zIndex" in config && config.zIndex != null) {
    sdkURL.searchParams.append("zIndex", config.zIndex.toString());
  }
  if (
    "hideLauncherBeforeOnboarded" in config &&
    config.hideLauncherBeforeOnboarded != null
  ) {
    sdkURL.searchParams.append(
      "hideLauncherBeforeOnboarded",
      config.hideLauncherBeforeOnboarded.toString()
    );
  }
  if ("colorScheme" in config && config.colorScheme != null) {
    sdkURL.searchParams.append("colorScheme", config.colorScheme.toString());
  }
  if ("paddingBottom" in config && config.paddingBottom != null) {
    sdkURL.searchParams.append(
      "paddingBottom",
      config.paddingBottom.toString()
    );
  }
  if ("paddingRight" in config && config.paddingRight != null) {
    sdkURL.searchParams.append("paddingRight", config.paddingRight.toString());
  }

  if ("paddingTop" in config && config.paddingTop != null) {
    sdkURL.searchParams.append("paddingTop", config.paddingTop.toString());
  }
  if ("paddingLeft" in config && config.paddingLeft != null) {
    sdkURL.searchParams.append("paddingLeft", config.paddingLeft.toString());
  }
  if ("position" in config && config.position != null) {
    sdkURL.searchParams.append("position", config.position.toString());
  }
  if ("element" in config && config.element != null) {
    sdkURL.searchParams.append("element", config.element.toString());
  }

  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", sdkURL.toString());
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);

  return await new Promise<Phantom>((resolve, _reject) => {
    window.addEventListener(
      PHANTOM_INITIALIZED_EVENT_NAME,
      function handleInit() {
        resolve({
          hide: () => {
            const iframe = document.getElementById(PHANTOM_IFRAME_ID);
            if (iframe != null) iframe.style.display = "none";
          },
          show: () => {
            const iframe = document.getElementById(PHANTOM_IFRAME_ID);
            if (iframe != null) iframe.style.display = "block";
          },
          swap: (options) => {
            window.phantom.app.swap({
              buy: options.buy,
              sell: options.sell,
              amount: options.amount,
            });
          },
          buy: (options) => {
            window.phantom.app.buy({
              buy: options.buy,
              amount: options.amount,
            });
          },
        });
        window.removeEventListener(PHANTOM_INITIALIZED_EVENT_NAME, handleInit);
      }
    );
  });
}
