# Phantom React UI Components Demo

This demo application showcases the various UI components and configurations available in the `@phantom/react-ui` package.

## Features

- **Connection Modal Demo**: Test different connection configurations with injected and embedded providers
- **Transaction Modal Demo**: Create and sign transactions with custom parameters
- **Message Signing Demo**: Sign messages with different encodings and formats
- **Theme Configuration**: Experiment with light/dark themes and custom styling

## Getting Started

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Start the development server:
   ```bash
   yarn dev
   ```

3. Open your browser to `http://localhost:5175`

## Available Scripts

- `yarn dev` - Start the development server on port 5175
- `yarn build` - Build the app for production
- `yarn lint` - Run ESLint
- `yarn check-types` - Run TypeScript type checking
- `yarn preview` - Preview the production build

## Component Examples

### Connection Modal

The connection modal allows users to connect with different provider types:

- **Injected Provider**: Browser extension wallets
- **Embedded Provider**: Mobile wallet integration with app-wallet or user-wallet options

### Transaction Modal

The transaction modal shows transaction details before signing:

- Configurable transaction parameters
- Real-time transaction status
- Error handling and user feedback

### Message Signing

Message signing functionality supports:

- UTF-8 text messages
- Hex-encoded messages
- Custom message presets
- Signature verification display

### Theme Configuration

Theme system includes:

- Light/Dark/Auto theme modes
- Custom CSS variables for styling
- Preset theme options
- Real-time theme switching

## Development

This example uses:

- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **@phantom/react-ui** for wallet integration

## Network Configuration

The demo is configured to use Solana's `devnet` for testing. All transactions are executed on the test network.

## Authentication

The app includes an auth callback handler at `/auth-callback` for handling wallet authentication redirects.