import { PHANTOM_INITIALIZED_EVENT_NAME, SDK_URL } from "./constants";
import { getRandomUUID } from "./helpers";

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
  namespace: string;
  skipInjection: boolean;
}>;

export interface Phantom {
  show: () => void;
  hide: () => void;
  buy: (options: { amount?: string; buy: string }) => void;
  swap: (options: { buy: string; sell?: string; amount?: string }) => void;
  navigate: ({ route, params }: { route: string; params?: any }) => void;
  solana?: any;
  ethereum?: any;
  sui?: any;
  bitcoin?: any;
  app: PhantomApp;
}

export interface PhantomApp {
  buy: (options: { buy: string; amount?: string }) => void;
  swap: (options: { buy: string; sell?: string; amount?: string }) => void;
  navigate: ({ route, params }: { route: string; params?: any }) => void;
}

export async function createPhantom(config: CreatePhantomConfig = {}): Promise<Phantom> {
  const container = document.head ?? document.documentElement;
  const scriptTag = document.createElement("script");

  const sdkURL = new URL(config.sdkURL ?? SDK_URL);
  if ("zIndex" in config && config.zIndex != null) {
    sdkURL.searchParams.append("zIndex", config.zIndex.toString());
  }
  if ("hideLauncherBeforeOnboarded" in config && config.hideLauncherBeforeOnboarded != null) {
    sdkURL.searchParams.append("hideLauncherBeforeOnboarded", config.hideLauncherBeforeOnboarded.toString());
  }
  if ("colorScheme" in config && config.colorScheme != null) {
    sdkURL.searchParams.append("colorScheme", config.colorScheme.toString());
  }
  if ("paddingBottom" in config && config.paddingBottom != null) {
    sdkURL.searchParams.append("paddingBottom", config.paddingBottom.toString());
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
  if ("skipInjection" in config && config.skipInjection != null) {
    sdkURL.searchParams.append("skipInjection", config.skipInjection.toString());
  }

  let namespace = "phantom";
  if ("namespace" in config && config.namespace != null) {
    namespace = config.namespace;
    sdkURL.searchParams.append("namespace", namespace);
  }

  const uuid = getRandomUUID();
  sdkURL.searchParams.append("uuid", uuid);

  // Append a timestamp parameter to get a fresh copy of the SDK
  sdkURL.searchParams.append("ts", Date.now().toString());

  scriptTag.setAttribute("type", "module");
  scriptTag.setAttribute("src", sdkURL.toString());
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);

  const eventName = `${PHANTOM_INITIALIZED_EVENT_NAME}#${uuid}`;

  return await new Promise<Phantom>((resolve, _reject) => {
    window.addEventListener(eventName, function handleInit(event: Event) {
      const customEvent = event as CustomEvent<{
        providers: {
          solana: any;
          ethereum: any;
          sui: any;
          bitcoin: any;
          app: any;
        };
      }>;
      const providers = customEvent.detail?.providers || {};

      resolve({
        navigate: ({ route, params }) => {
          providers.app.navigate({ route, params });
        },
        hide: () => {
          const iframe = document.getElementById(`${namespace}-wallet`);
          if (iframe != null) iframe.style.display = "none";
        },
        show: () => {
          const iframe = document.getElementById(`${namespace}-wallet`);
          if (iframe != null) iframe.style.display = "block";
        },
        swap: options => {
          providers.app.swap({
            buy: options.buy,
            sell: options.sell,
            amount: options.amount,
          });
        },
        buy: options => {
          providers.app.buy({
            buy: options.buy,
            amount: options.amount,
          });
        },
        solana: providers.solana,
        ethereum: providers.ethereum,
        sui: providers.sui,
        bitcoin: providers.bitcoin,
        app: providers.app,
      });

      window.removeEventListener(eventName, handleInit);
    });
  });
}
