import type {
  WalletEventsWindow,
  WindowAppReadyEvent,
  WindowRegisterWalletEvent,
  WindowRegisterWalletEventCallback,
} from "@wallet-standard/core";
import type { EmbeddedWallet } from "./wallets/embedded";

const WindowRegisterWalletEventType: WindowRegisterWalletEvent["type"] = "wallet-standard:register-wallet";
const WindowAppReadyEventType: WindowAppReadyEvent["type"] = "wallet-standard:app-ready";

export function initialize(wallet: EmbeddedWallet): void {
  const callback: WindowRegisterWalletEventCallback = ({ register }) => register(wallet);

  const walletEventsWindow = window as WalletEventsWindow;

  try {
    walletEventsWindow.dispatchEvent(new RegisterWalletEvent(callback));
  } catch (error) {
    console.error(`${WindowRegisterWalletEventType} event could not be dispatched\n`, error);
  }

  try {
    walletEventsWindow.addEventListener(WindowAppReadyEventType, ({ detail: api }) => callback(api));
  } catch (error) {
    console.error(`${WindowAppReadyEventType} event listener could not be added\n`, error);
  }
}

class RegisterWalletEvent extends Event implements WindowRegisterWalletEvent {
  readonly #detail: WindowRegisterWalletEventCallback;

  get detail(): WindowRegisterWalletEvent["detail"] {
    return this.#detail;
  }

  get type(): WindowRegisterWalletEvent["type"] {
    return WindowRegisterWalletEventType;
  }

  constructor(callback: WindowRegisterWalletEventCallback) {
    super(WindowRegisterWalletEventType, {
      bubbles: false,
      cancelable: false,
      composed: false,
    });

    this.#detail = callback;
  }

  /** @deprecated */
  preventDefault(): never {
    throw new Error("preventDefault cannot be called");
  }

  /** @deprecated */
  stopImmediatePropagation(): never {
    throw new Error("stopImmediatePropagation cannot be called");
  }

  /** @deprecated */
  stopPropagation(): never {
    throw new Error("stopPropagation cannot be called");
  }
}
