import type {
  StandardEventsListeners,
  StandardEventsNames,
  StandardEventsOnMethod,
  Wallet,
} from "@wallet-standard/core";

export abstract class AbstractWalletStandard implements Wallet {
  readonly #listeners: { [E in StandardEventsNames]?: Array<StandardEventsListeners[E]> } = {};

  get version(): Wallet["version"] {
    return "1.0.0";
  }

  abstract get name(): Wallet["name"];
  abstract get icon(): Wallet["icon"];
  abstract get chains(): Wallet["chains"];
  abstract get features(): Wallet["features"];
  abstract get accounts(): Wallet["accounts"];

  protected _on: StandardEventsOnMethod = (event, listener) => {
    this.#listeners[event] ??= [];
    this.#listeners[event].push(listener);

    return (): void => {
      this._off(event, listener);
    };
  };

  protected _off<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): void {
    this.#listeners[event] = this.#listeners[event]?.filter(existingListener => {
      return listener !== existingListener;
    });
  }

  protected _emit<E extends StandardEventsNames>(event: E, ...args: Parameters<StandardEventsListeners[E]>): void {
    this.#listeners[event]?.forEach(listener => {
      // eslint-disable-next-line prefer-spread
      listener.apply(null, args);
    });
  }
}
