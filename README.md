# Phantom Embedded Wallet SDK

Phantom Embedded enables you to seamlessly onboard users to your application, without requiring them to have previously
installed a wallet. With Phantom Embedded, users can create a self custodial wallet with just their Google account and a
4-digit pin. Once created, this wallet will automatically sync with [Phantom](https://phantom.app)'s mobile and
extension apps without the user needing to know their seed phrase or manage any private keys.

In addition to powering wallet creation, Phantom Embedded also comes with a built-in UI for users to view and manage
their holdings. This UI serves as a trusted interface for users to sign messages and transactions on your app.

## Features

- Create self custodial wallets without leaving your application
- Onboard users via Sign in with Google and a 4-digit pin (no seed phrases)
- Sync embedded wallets with Phantom's mobile and extension apps
- Sign transactions and message on Solana (more chains coming soon)
- View, send, and receive tokens on Solana, Ethereum, Bitcoin, Base, and Polygon
- Pricing: **FREE**

## Prerequisites

Before you begin, ensure you have:
- Node.js 16 or higher installed
- A modern web browser
- Basic understanding of Web3 development
- (Optional) A Google account for testing wallet creation

## Quickstart

1. Install the Phantom Embedded SDK

```bash
yarn | npm | pnpm add @phantom/wallet-sdk
```

2. Load the Phantom Embedded wallet in your web application

```tsx
import {createPhantom} from "@phantom/wallet-sdk"

const opts: CreatePhantomConfig = {
    zIndex: 10_000,
    hideLauncherBeforeOnboarded: true,
}

const App = () => {
    useEffect(() => {
        createPhantom(opts);
    }, []);
...
}
```

3. [Integrate Phantom](https://docs.phantom.app/solana/integrating-phantom) as you would normally. Whenever a user
   interacts with Phantom (e.g. `window.phantom.solana.connect()`), the Phantom Embedded wallet will automatically
   initialize if the user does not have Phantom already installed.

## Configuration

The following optional parameters can be passed as `createPhantom({options...})` to customize the Phantom Embedded
wallet experience.

| Parameter                     | Type    | Description                                                                                                                                                                    |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hideLauncherBeforeOnboarded` | boolean | If `true`, the Phantom Embedded UI will be hidden until the user engages with Phantom. Defaults to `false`.                                                                    |
| `colorScheme`                 | string  | The background color of the Phantom Embedded iframe, which should be configured to match your site's theme. Can be `"light"`, `"dark"`, or `"normal"`. Defaults to `"normal"`. |
| `zIndex`                      | number  | The z-index of the Phantom Embedded UI. Defaults to `10_000`.                                                                                                                  |
| `paddingBottom`               | number  | The number of pixels between the Phantom Embedded UI and the right edge of the web. Defaults to `0`.                                                                           |
| `paddingRight`                | number  | The number of pixels between the Phantom Embedded UI and the bottom edge of the web. Defaults to `0`.                                                                          |
| `paddingTop`                  | number  | The number of pixels between the Phantom Embedded UI and the top edge of the web. Defaults to `0`.                                                                             |
| `paddingLeft`                 | number  | The number of pixels between the Phantom Embedded UI and the left edge of the web. Defaults to `0`.                                                                            |
| `position`                    | enum    | The corner of the app where the Phantom wallet will be displayed. Can be `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"`. Defaults to "bottom-left".            |

## Controlling the wallet after initialization

The createPhantom method will return an object that allows you to control the embedded wallet after initialization.

| Property | Type       | Description                                                                                          |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `show`   | () => void | Shows the embedded wallet. You only need to call this if you have called `hide`.                     |
| `hide`   | () => void | Hides the embedded wallet. The embedded wallet will now be invisible to users until you call `show`. |

```tsx
import { createPhantom } from "@phantom/wallet-sdk";

const opts: CreatePhantomConfig = {
  zIndex: 10_000,
  hideLauncherBeforeOnboarded: true,
};
const phantom = createPhantom(opts);

// To hide the embedded wallet
phantom.hide();

// To show the embedded wallet
phantom.show();
```

## See It In Action

Try out Phantom Embedded via our demo app: https://sandbox.phantom.dev/sol-embedded-sandbox

> Note: Phantom Embedded will not initialize if it detects that the user already has the Phantom extension installed, or
> if the user is accessing the page from within the Phantom mobile app.

## Give Feedback

Phantom Embedded is in active development and will be prioritizing features requested by early adopters. If you are
interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Frequently Asked Questions

<details>
  <summary>How does the embedded wallet work with the Phantom extension?</summary>

    If the Phantom extension is detected, we will not inject the embedded wallet. Phantom users can continue using their extension like normal.

</details>
<details>
  <summary>What does `createPhantom()` do?</summary>

    The Phantom embedded wallet lives inside an iframe. The `createPhantom` function loads and attaches the iframe to your website.

</details>
<details>
  <summary>How do I interact with the embedded wallet?</summary>

    Once `createPhantom` has been called, `window.phantom.solana` and a compliant wallet-standard provider will also be available in the global scope of your website. This means that most of your existing code for interacting with Solana wallets should work out of the box.

    Once a user has onboarded to the embedded wallet, they should be able to click your “connect wallet” button, which gives your website access to their Solana address. After that, signing messages and transactions should just work as normal.

</details>
<details>
  <summary>I can't see the embedded wallet on my website. What's wrong?</summary>

    The most common cause is that you are using a browser with the Phantom extension installed. If the Phantom extension is detected, we will not inject the embedded wallet.

    You can temporarily disable the Phantom extension by going to `chrome://extensions` and toggling Phantom off.

</details>
<details>
  <summary>How much does this cost?</summary>

    It's free!

</details>

## Troubleshooting

Common issues and their solutions:

1. **Wallet not appearing**
   - Check if Phantom extension is installed and disabled
   - Verify z-index configuration
   - Ensure proper initialization

2. **Connection issues**
   - Check console for error messages
   - Verify network connectivity
   - Ensure proper configuration parameters

3. **Styling conflicts**
   - Adjust z-index
   - Check CSS isolation
   - Verify position parameters

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Disclaimers

We are providing early access to beta software for testing purposes only. Embedded wallet should be used in a
non-production environment only. Phantom will not be liable for any losses or damages suffered by you or your end users
if you push the early access version of embedded wallets to a production environment.

All suggestions, enhancement requests, recommendations or other feedback provided by you relating to the embedded wallet
will be the sole and exclusive property of Phantom and by using the early access version of embedded wallets and
providing feedback to Phantom you agree to assign any rights in that feedback to Phantom.

## Examples

### Basic Connection
```tsx
import { createPhantom } from "@phantom/wallet-sdk";

const App = () => {
  const connectWallet = async () => {
    try {
      const connection = await window.phantom.solana.connect();
      console.log("Connected with:", connection.publicKey.toString());
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  return <button onClick={connectWallet}>Connect Phantom</button>;
};
```

### Transaction Signing
```tsx
import { createPhantom } from "@phantom/wallet-sdk";
import { Transaction } from "@solana/web3.js";

const App = () => {
  const signTransaction = async () => {
    const transaction = new Transaction();
    // Add your transaction instructions here
    
    try {
      const signedTx = await window.phantom.solana.signTransaction(transaction);
      console.log("Transaction signed:", signedTx);
    } catch (err) {
      console.error("Signing failed:", err);
    }
  };
};
```
