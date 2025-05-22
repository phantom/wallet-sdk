# Phantom Wallet SDK

This monorepo contains the Phantom Wallet SDKs and demo applications that demonstrate their usage.

## Packages

- **@phantom/wallet-sdk (browser-embedded-sdk directory)**: The embedded wallet SDK that provides the Phantom wallet integration with UI in directly in your app.
- **@phantom/browser-embedded-sdk-demo-app**: A React-based demo app that demonstrates how to use the embedded wallet SDK.
- **@phantom/browser-sdk**: Core browser SDK that provides access to the Phantom wallet functionality without UI components. Works with Phantom extension and in Phantom mobile dapp browser.
- **@phantom/react-sdk**: A React wrapper for the brower SDK that provides React components and hooks for easier integration in React applications. Works with Phantom extension and in Phantom mobile dapp browser.

## Getting Started

For detailed documentation and usage examples, please refer to each package's README file:
- [@phantom/wallet-sdk documentation](./packages/browser-embedded-sdk/README.md)

## Development

```bash
# Install dependencies
yarn install

# Start the demo app
yarn start:demo

# Build all packages
yarn build
```

## Give Feedback

Phantom SDKs are in active development and will be prioritizing features requested by early adopters. If you are
interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Disclaimers

The embedded wallet is a beta version, and Phantom will not be liable for any losses or damages suffered by you or your end users.

Any suggestions, enhancement requests, recommendations, or other feedback provided by you regarding the embedded wallet will be the exclusive property of Phantom. By using this beta version and providing feedback, you agree to assign any rights in that feedback to Phantom.
