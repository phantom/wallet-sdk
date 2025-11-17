# Phantom SDK + wagmi Integration Example

This example demonstrates how to integrate the Phantom SDK's Ethereum provider with [wagmi](https://wagmi.sh/) to create a seamless Web3 experience using standard Ethereum tooling.

## Features

- Custom wagmi connector for Phantom SDK
- EIP-1193 compliant Ethereum provider integration
- Sign message functionality using wagmi hooks
- Chain switching support
- Standard wagmi patterns and best practices

## How it Works

1. **Custom Connector**: We created a custom wagmi connector (`phantom-connector.ts`) that wraps the Phantom SDK
2. **EIP-1193 Compliance**: The Phantom SDK's `sdk.ethereum` provider is EIP-1193 compliant, making it compatible with wagmi
3. **Standard Hooks**: Use standard wagmi hooks like `useSignMessage`, `useConnect`, `useAccount` etc.
4. **Seamless Integration**: The Phantom wallet appears as a standard Ethereum wallet to wagmi and other Web3 tools

## Architecture

```
wagmi hooks → Phantom Connector → Phantom SDK → Ethereum Provider (EIP-1193)
```

## Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Start the development server:

   ```bash
   yarn start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view the example

## Key Files

- `src/phantom-connector.ts` - Custom wagmi connector for Phantom SDK
- `src/wagmi.ts` - wagmi configuration
- `src/WalletDemo.tsx` - Demo component showcasing the integration
- `src/App.tsx` - Main app with wagmi and React Query providers

## Usage

1. Click "Connect Phantom Wallet" to connect using the embedded Phantom wallet
2. Once connected, you'll see your Ethereum address and current chain
3. Enter a message and click "Sign Message" to test the integration
4. The signature will be displayed, proving the wagmi integration works

## Integration Benefits

- **Standard Web3 Tooling**: Use any wagmi-compatible library or tool
- **Type Safety**: Full TypeScript support with wagmi's typed hooks
- **React Patterns**: Familiar React hooks pattern for Web3 operations
- **Ecosystem Compatibility**: Works with the entire wagmi/viem ecosystem

## Next Steps

This example can be extended to support:

- Transaction sending with `useSendTransaction`
- Contract interactions with `useReadContract` and `useWriteContract`
- ENS resolution with `useEnsName` and `useEnsAddress`
- Any other wagmi functionality

The Phantom SDK's EIP-1193 compliant provider makes all wagmi features available out of the box!
