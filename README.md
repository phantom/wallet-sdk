# Phantom Embedded Wallet SDK

Phantom Embedded enables you to seamlessly onboard users to your application, without requiring them to have previously installed a wallet. With Phantom Embedded, users can create a self custodial wallet with just their Google account and a 4-digit pin. Once created, this wallet will automatically sync with [Phantom](https://phantom.app)'s mobile and extension apps without the user needing to know their seed phrase or manage any private keys.

In addition to powering wallet creation, Phantom Embedded also comes with a built-in UI for users to view and manage their holdings. This UI serves as a trusted interface for users to sign messages and transactions on your app.

## Features

- Self custodial wallets via Sign in with Google and 4-digit pin (no seed phrases)
- Sign transactions and message on Solana (more chains coming soon)
- View, send, and receive tokens on Solana, Ethereum, Bitcoin, Base, and Polygon
- Automatic syncing of wallets with Phantom's mobile and extension apps
- Pricing: **FREE**

## Quickstart

1. Install the Phantom Embedded SDK

```bash
yarn | npm | pnpm add @phantom/wallet-sdk
```

2. Load the Phantom Embedded wallet in your web application

```jsx
import { createPhantom } from "@phantom/wallet-sdk"

const App = () => {
  useEffect(() => {
    createPhantom();
  }, []);
  ...
}
```

3. [Integrate Phantom](https://docs.phantom.app/solana/integrating-phantom) as you would normally. Whenever a user interacts with Phantom (e.g. `window.phantom.connect()`), the Phantom Embedded wallet will automatically initialize if the user does not have Phantom already installed.

## See It In Action

Try out Phantom Embedded via our demo app: https://sandbox.phantom.dev/sol-embedded-sandbox

> Note: Phantom Embedded will not initialize if it detects that the user already has the Phantom extension installed, or if the user is accessing the page from within the Phantom mobile app.

## Give Feedback

Phantom Embedded is in active development and will be prioritizing features requested by early adopters. If you are interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

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
  <summary>How much does this cost?</summary>

    It's free!

</details>
<details>
  <summary>I can't see the embedded wallet on my website. What's wrong?</summary>

    The most common cause is that you are using a browser with the Phantom extension installed. If the Phantom extension is detected, we will not inject the embedded wallet.

    You can temporarily disable the Phantom extension by going to `chrome://extensions` and toggling Phantom off.

</details>
<details>
  <summary>How do I change the z-index of the embedded wallet?</summary>

    The embedded wallet iframe injects with a z-index of 10,000. You can pass a custom zIndex to `createPhantom` like so:


    ```
    createPhantom({zIndex: 10_000});
    ```

</details>

## Disclaimers

We are providing early access to beta software for testing purposes only. Embedded wallet should be used in a non-production environment only. Phantom will not be liable for any losses or damages suffered by you or your end users if you push the early access version of embedded wallets to a production environment.

All suggestions, enhancement requests, recommendations or other feedback provided by you relating to the embedded wallet will be the sole and exclusive property of Phantom and by using the early access version of embedded wallets and providing feedback to Phantom you agree to assign any rights in that feedback to Phantom.
