import { EmbeddedProvider as CoreEmbeddedProvider } from "@phantom/embedded-provider-core";
import type { EmbeddedProviderConfig, PlatformAdapter } from "@phantom/embedded-provider-core";
import { IndexedDbStamper } from "@phantom/indexed-db-stamper";
import {
  BrowserStorage,
  BrowserURLParamsAccessor,
  BrowserAuthProvider,
  BrowserPhantomAppProvider,
  BrowserLogger,
} from "./adapters";
import { debug, DebugCategory } from "../../debug";
import { detectBrowser, getPlatformName } from "../../utils/browser-detection";
import type { Provider } from "../../types";
import { ANALYTICS_HEADERS } from "@phantom/constants";
import type { AddressType } from "@phantom/client";

export class EmbeddedProvider extends CoreEmbeddedProvider implements Provider {
  private addressTypes: AddressType[];

  constructor(config: EmbeddedProviderConfig) {
    debug.log(DebugCategory.EMBEDDED_PROVIDER, "Initializing Browser EmbeddedProvider", { config });
    // Create browser platform adapter
    const urlParamsAccessor = new BrowserURLParamsAccessor();
    const stamper = new IndexedDbStamper({
      dbName: `phantom-embedded-sdk-${config.appId}`,
      storeName: "crypto-keys",
      keyName: "signing-key",
    });

    const platformName = getPlatformName();
    const { name: browserName, version } = detectBrowser();

    const platform: PlatformAdapter = {
      storage: new BrowserStorage(),
      authProvider: new BrowserAuthProvider(urlParamsAccessor),
      phantomAppProvider: new BrowserPhantomAppProvider(),
      urlParamsAccessor,
      stamper,
      name: platformName, // Use detected browser name and version for identification
      analyticsHeaders: {
        [ANALYTICS_HEADERS.SDK_TYPE]: "browser",
        [ANALYTICS_HEADERS.PLATFORM]: browserName, // firefox, chrome, safari, etc.
        [ANALYTICS_HEADERS.PLATFORM_VERSION]: version, // Full user agent for more detailed info
        [ANALYTICS_HEADERS.APP_ID]: config.appId,
        [ANALYTICS_HEADERS.WALLET_TYPE]: config.embeddedWalletType as "app-wallet" | "user-wallet",
        [ANALYTICS_HEADERS.SDK_VERSION]: __SDK_VERSION__, // Replaced at build time
      },
    };

    debug.log(DebugCategory.EMBEDDED_PROVIDER, "Detected platform", { platformName });

    const logger = new BrowserLogger();

    super(config, platform, logger);

    this.addressTypes = config.addressTypes;

    debug.info(DebugCategory.EMBEDDED_PROVIDER, "Browser EmbeddedProvider initialized");
  }

  getEnabledAddressTypes(): AddressType[] {
    return this.addressTypes;
  }
}
