# @phantom/wallet-sdk

### Integrating the Embedded Wallet: Getting Started

1. Install the Phantom SDK (https://github.com/phantom/wallet-sdk)

```bash
yarn | npm | pnpm add @phantom/wallet-sdk
```

1.  Load the embedded wallet and the launcher

```tsx
import { createPhantom } from "@phantom/wallet-sdk"

const opts: CreatePhantomConfig = {
    zIndex: 10_000,
    hideLauncherBeforeOnboarded: true,
}

const App = () => {
  useEffect(() => {
		createPhantom();
  }, []);
	...
}
```

### Options

- hideLauncherBeforeOnboarded: Set to true to avoid showing the launcher button until a user has onboarded to the Phantom Wallet.
- zIndex: Pass a custom zIndex to the Phantom Wallet iframe
- colorScheme: If the Phantom Wallet iframe has an opaque background on your site. You should set this color scheme to match the color scheme of your site.
