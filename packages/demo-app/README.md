# Phantom Wallet SDK Demo App

This project demonstrates how to integrate the Phantom Wallet SDK into a React application.

## Getting Started

1. Make sure you've installed dependencies in the root of the monorepo:

   ```
   npm install
   ```

2. Start the demo app:

   ```
   npm run start:demo
   ```

3. Open your browser at http://localhost:5173

## Features Demonstrated

- Initializing the Phantom Wallet SDK
- Showing and hiding the wallet interface
- Buying tokens
- Swapping tokens
- Handling wallet connections

## Implementation Details

The main implementation is in `src/components/PhantomWallet.tsx`, which shows how to:

1. Initialize the wallet using `createPhantom()`
2. Interact with wallet methods
3. Handle loading and error states
4. Create a basic UI for wallet interactions
