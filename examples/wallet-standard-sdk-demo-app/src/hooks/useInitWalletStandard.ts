import * as React from "react";

import { AddressType, type BrowserSDKConfig } from "@phantom/browser-sdk";
import { initialize } from "@phantom/sdk-wallet-standard";

const config: BrowserSDKConfig = {
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  appId: "11111111-1111-1111-1111-11111111",
  embeddedWalletType: "user-wallet",
  apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
  authOptions: {
    authUrl: "https://staging-connect.phantom.app/login",
  },
  autoConnect: true,
};

export function useInitWalletStandard(): void {
  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    initialize(config);
    isInitialized.current = true;
  }, []);
}
