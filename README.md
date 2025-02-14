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
       const phantom = createPhantom(opts);
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

| Parameter                     | Type    | Description                                                                                                                                                                                 |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hideLauncherBeforeOnboarded` | boolean | If `true`, the Phantom Embedded UI will be hidden until the user engages with Phantom. Defaults to `false`.                                                                                 |
| `colorScheme`                 | string  | The background color of the Phantom Embedded iframe, which should be configured to match your site's theme. Can be `"light"`, `"dark"`, or `"normal"`. Defaults to `"normal"`.              |
| `zIndex`                      | number  | The z-index of the Phantom Embedded UI. Defaults to `10_000`.                                                                                                                               |
| `paddingBottom`               | number  | The number of pixels between the Phantom Embedded UI and the right edge of the web. Defaults to `0`.                                                                                        |
| `paddingRight`                | number  | The number of pixels between the Phantom Embedded UI and the bottom edge of the web. Defaults to `0`.                                                                                       |
| `paddingTop`                  | number  | The number of pixels between the Phantom Embedded UI and the top edge of the web. Defaults to `0`.                                                                                          |
| `paddingLeft`                 | number  | The number of pixels between the Phantom Embedded UI and the left edge of the web. Defaults to `0`.                                                                                         |
| `position`                    | enum    | The corner of the app where the Phantom wallet will be displayed. Can be `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"`. Defaults to "bottom-left".                         |
| `element`                     | string  | The ID of an HTML element where the wallet will be attached into. The wallet will be opened by default and rendered without the icon. The `position`, and `padding` otpions will be ignored |

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

// To navigate to the swapper
phantom.swap({
  buy: "solana:101:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Caip19 token address https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md
  sell: "solana:101:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Caip19 token address
  amount: "100000000", // Amount to sell
});

// To select only the token to swap to
phantom.swap({
  buy: "solana:101:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Caip19 token address
});

// To open the onramp screen
phantom.buy({
  amount: 100, // USD amount in number (optional)
  buy: "solana:101:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Caip19 token address
});
```

## Doing transactions with the embedded wallet

The embedded wallet will listen to standard wallet provider events, so you can use it as you would any other wallet. For example, to connect to the wallet:

```tsx
import { createPhantom } from "@phantom/wallet-sdk";

const opts: CreatePhantomConfig = {
  zIndex: 10_000,
  hideLauncherBeforeOnboarded: true,
};

const phantom = createPhantom(opts);

// Connect to the wallet (solana)
const handleConnect = () => {
  window.solana.connect();
};

// Connect to the wallet (evm)
const handleConnect = () => {
  window.ethereum.request({ method: "eth_requestAccounts" });
};
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

### Versioning and Publishing Packages

We use Changesets for versioning and GitHub Actions for publishing. The process is as follows:

1. After making changes, create a changeset locally:

   ```
   yarn changeset
   ```

2. Follow the prompts to describe your changes and select the appropriate version bump.
3. Commit the generated changeset file along with your code changes.

4. Push your changes and open a pull request:

   ```
   git push
   ```

5. The pull request should contain your code changes and the new changeset file(s).

6. Once the pull request is merged to the main branch, the CI/CD pipeline (GitHub Actions) will automatically:

   - Create a new "Version Packages" pull request that includes version bumps and changelog updates

7. Review the "Version Packages" pull request:

   - Check that the version bumps and changelog entries are correct
   - Make any necessary adjustments
   - Approve the pull request

8. Merge the "Version Packages" pull request:

   - This triggers the publish workflow

9. The publish workflow will automatically:
   - Publish the updated packages to our npm registry
   - Push the new version tags to the repository

## Disclaimers

We are providing early access to beta software for testing purposes only. Embedded wallet should be used in a
non-production environment only. Phantom will not be liable for any losses or damages suffered by you or your end users
if you push the early access version of embedded wallets to a production environment.

All suggestions, enhancement requests, recommendations or other feedback provided by you relating to the embedded wallet
will be the sole and exclusive property of Phantom and by using the early access version of embedded wallets and
providing feedback to Phantom you agree to assign any rights in that feedback to Phantom.
