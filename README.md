# 🟣 Phantom Embedded Wallet SDK  

**Seamlessly onboard users to your app with a self-custodial wallet linked to their Google account & PIN.**  
With **Phantom Embedded**, users can create a wallet **without needing a seed phrase or private key management**.  

<div align="center">

[![GitHub Repo stars](https://img.shields.io/github/stars/phantom/wallet-sdk?logo=github&color=yellow)](https://github.com/phantom/wallet-sdk/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/phantom/wallet-sdk?logo=github&color=blue)](https://github.com/phantom/wallet-sdk/network/members)
[![GitHub last commit](https://img.shields.io/github/last-commit/phantom/wallet-sdk?logo=git)](https://github.com/phantom/wallet-sdk/commits/main)
[![License](https://img.shields.io/github/license/phantom/wallet-sdk?logo=open-source-initiative)](https://github.com/phantom/wallet-sdk/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/924442927399313448?logo=discord&color=5865F2)](https://discord.gg/phantom)
[![Twitter Follow](https://img.shields.io/twitter/follow/phantom?style=flat&logo=twitter)](https://x.com/phantom)

</div>

---

## 🚀 **Features**
✅ **Self-custodial wallets** – no seed phrases required.  
✅ **Onboard users via Google login & a 4-digit PIN**.  
✅ **Embedded wallet syncs with Phantom mobile & extension apps**.  
✅ **Supports signing transactions & messages on Solana** *(more chains coming soon)*.  
✅ **Multi-chain support** – Solana, Ethereum, Bitcoin, Base, Polygon.  
✅ **Built-in UI for wallet management**.  
✅ **Completely free to use!**  

---

## ⚡ **Quickstart**  

### 1️⃣ **Install Phantom Embedded SDK**  

```bash  
yarn add @phantom/wallet-sdk  
```

or  

```bash  
npm install @phantom/wallet-sdk  
```
or  

```bash  
pnpm add @phantom/wallet-sdk  
```

---

### 2️⃣ **Load Phantom Embedded Wallet in Your Web App**  

```bash  
import { createPhantom } from "@phantom/wallet-sdk";

const opts: CreatePhantomConfig = {
    zIndex: 10_000,
    hideLauncherBeforeOnboarded: true,
};

const App = () => {
    useEffect(() => {
        createPhantom(opts);
    }, []);
};
```
---

### 3️⃣ **Integrate Phantom as Usual**  

Once `Phantom Embedded` is set up, users **automatically onboard** when interacting with Phantom:  

```bash
window.phantom.solana.connect();  
```

If **Phantom is not installed**, the **embedded wallet initializes automatically**.  
For a full guide, check the **[Phantom Docs](https://docs.phantom.app/solana/integrating-phantom)**.

---

## ⚙️ **Configuration Options**  

Customize the Phantom Embedded wallet using the following **optional parameters**:  

| Parameter                     | Type    | Description |
| ----------------------------- | ------- | -------------------------------------------------------------------------- |
| `hideLauncherBeforeOnboarded` | boolean | Hides the UI until the user interacts with Phantom. Defaults to `false`. |
| `colorScheme`                 | string  | UI theme: `"light"`, `"dark"`, or `"normal"`. Defaults to `"normal"`. |
| `zIndex`                      | number  | Controls the wallet UI stacking order. Defaults to `10_000`. |
| `paddingBottom`               | number  | Adjusts UI spacing from the bottom. Defaults to `0`. |
| `paddingRight`                | number  | Adjusts UI spacing from the right. Defaults to `0`. |
| `paddingTop`                  | number  | Adjusts UI spacing from the top. Defaults to `0`. |
| `paddingLeft`                 | number  | Adjusts UI spacing from the left. Defaults to `0`. |
| `position`                    | enum    | Wallet UI placement: `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"`. Defaults to `"bottom-left"`. |

---

## 🔧 **Controlling the Wallet After Initialization**  

The `createPhantom` method returns an object for controlling the wallet UI:  

| Method | Description |
| ------- | ----------- |
| `show()`  | Displays the Phantom Embedded wallet. |
| `hide()`  | Hides the wallet UI until `show()` is called. |

```bash  
import { createPhantom } from "@phantom/wallet-sdk";

const phantom = createPhantom({ hideLauncherBeforeOnboarded: true });

// Hide wallet UI
phantom.hide();

// Show wallet UI
phantom.show();
```
---

## 🎬 **See It In Action**  

Try **Phantom Embedded** via our **[demo app](https://sandbox.phantom.dev/sol-embedded-sandbox)**.

📌 **Note:**  
- The embedded wallet **will NOT initialize** if Phantom Extension is detected.  
- On **Phantom mobile**, the native wallet will be used instead.

---

## 💡 **Frequently Asked Questions**  

<details>
  <summary>How does the embedded wallet work with the Phantom extension?</summary>
  If the Phantom extension is detected, we will **not inject the embedded wallet**. Users will continue using the extension normally.
</details>

<details>
  <summary>What does `createPhantom()` do?</summary>
  It loads the **Phantom Embedded wallet inside an iframe** and attaches it to your site.
</details>

<details>
  <summary>How do I interact with the embedded wallet?</summary>
  Once initialized, `window.phantom.solana` will be available globally.  
  Most **existing Solana wallet integration code** will work **without modification**.
</details>

<details>
  <summary>I can't see the embedded wallet on my website. What's wrong?</summary>
  - If Phantom Extension is installed, the **embedded wallet will NOT load**.  
  - Disable the extension via `chrome://extensions` to test Phantom Embedded.
</details>

<details>
  <summary>How much does this cost?</summary>
  It's **free**!
</details>

---

## ⚠️ **Disclaimers**  

🚨 **Phantom Embedded is in BETA.**  
It should **NOT** be used in production yet.  

- **Use in test environments only.**  
- Phantom is **not liable for any losses** if deployed in production.  
- All **feedback & feature requests** are welcome!  

---

## 💬 **Join the Community**  
<p align="left">
  <a href="https://discord.gg/phantom">
    <img src="https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white&style=for-the-badge" alt="Discord">
  </a>
  <a href="https://x.com/phantom">
    <img src="https://img.shields.io/badge/Twitter-000000?logo=x&logoColor=white&style=for-the-badge" alt="Twitter (X)">
  </a>
</p>

