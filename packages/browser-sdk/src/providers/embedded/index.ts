import { EmbeddedProvider as CoreEmbeddedProvider } from "@phantom/embedded-provider-core";
import type { EmbeddedProviderConfig, PlatformAdapter } from "@phantom/embedded-provider-core";
import { IndexedDbStamper } from "@phantom/indexed-db-stamper";
import { BrowserStorage, BrowserURLParamsAccessor, BrowserAuthProvider, BrowserLogger } from "./adapters";
import { debug, DebugCategory } from "../../debug";
import { getPlatformName } from "../../utils/browser-detection";
import type { Provider } from "../../types";

export class EmbeddedProvider extends CoreEmbeddedProvider implements Provider {
  constructor(config: EmbeddedProviderConfig) {
    debug.log(DebugCategory.EMBEDDED_PROVIDER, "Initializing Browser EmbeddedProvider", { config });

    // Create browser platform adapter
    const urlParamsAccessor = new BrowserURLParamsAccessor();
    const stamper = new IndexedDbStamper({
      dbName: `phantom-browser-test-sdk-${config.organizationId}`,
      storeName: "crypto-keys",
      keyName: "signing-key",
    });

    const platformName = getPlatformName();

    const platform: PlatformAdapter = {
      storage: new BrowserStorage(),
      authProvider: new BrowserAuthProvider(urlParamsAccessor),
      urlParamsAccessor,
      stamper,
      name: platformName, // Use detected browser name and version for identification
    };

    debug.log(DebugCategory.EMBEDDED_PROVIDER, "Detected platform", { platformName });

    const logger = new BrowserLogger();

    super(config, platform, logger);

    debug.info(DebugCategory.EMBEDDED_PROVIDER, "Browser EmbeddedProvider initialized");
  }
}
