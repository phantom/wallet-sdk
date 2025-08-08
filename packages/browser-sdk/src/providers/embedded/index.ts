import { EmbeddedProvider as CoreEmbeddedProvider } from "@phantom/embedded-provider-core";
import type { EmbeddedProviderConfig, PlatformAdapter } from "@phantom/embedded-provider-core";
import { IndexedDbStamper } from "@phantom/indexed-db-stamper";
import { BrowserStorage, BrowserURLParamsAccessor, BrowserAuthProvider, BrowserLogger } from "./adapters";
import { debug, DebugCategory } from "../../debug";
import type { Provider } from "../../types";

export class EmbeddedProvider extends CoreEmbeddedProvider implements Provider {
  constructor(config: EmbeddedProviderConfig) {
    debug.log(DebugCategory.EMBEDDED_PROVIDER, "Initializing Browser EmbeddedProvider", { config });

    // Create browser platform adapter
    const urlParamsAccessor = new BrowserURLParamsAccessor();
    const stamper = new IndexedDbStamper({
      dbName: `phantom-browser-sdk-${config.organizationId}`,
      storeName: "crypto-keys",
      keyName: "signing-key",
    });
    
    const platform: PlatformAdapter = {
      storage: new BrowserStorage(),
      authProvider: new BrowserAuthProvider(urlParamsAccessor),
      urlParamsAccessor,
      stamper,
    };

    const logger = new BrowserLogger();

    super(config, platform, logger);

    debug.info(DebugCategory.EMBEDDED_PROVIDER, "Browser EmbeddedProvider initialized");
  }
}
