# Phantom React SDK Example

This example demonstrates how to use the `@phantom/react-sdk` package to create a connect modal with built-in mobile deeplink support.

## Features

- 🖥️ **Desktop Support**: Traditional web-based wallet connection
- 📱 **Mobile Support**: Automatic mobile device detection with deeplink button
- 🔗 **Deeplink Integration**: Redirects to Phantom mobile app via phantom.com/ul
- 🎨 **Styled Modal**: Pre-built, customizable connection modal
- ⚡ **React Hooks**: Simple integration with React components

## Mobile Experience

When accessed on a mobile device, the connect modal will show an additional "Open in Phantom App" button that:

1. Detects if the user is on a mobile device
2. Shows a mobile-specific connect button
3. Redirects to `https://phantom.com/ul/browse/[current_url]`
4. Phantom's universal link system handles opening the mobile app

## Getting Started

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Build the required packages:

   ```bash
   yarn predev
   ```

3. Start the development server:

   ```bash
   yarn dev
   ```

4. Open your browser to http://localhost:5178

## Testing Mobile Features

To test the mobile functionality:

1. **Desktop**: Use browser dev tools to simulate a mobile device
2. **Mobile**: Visit the URL on your phone and test the deeplink behavior
3. **Device Info**: Click "Show Device Info" to see detection details

## Code Structure

- `App.tsx` - Main app with PhantomProvider setup
- `ConnectExample.tsx` - Connection demo component with device detection
- Uses `@phantom/react-sdk` for the modal UI and ConnectButton component
- Uses `@phantom/browser-sdk` for mobile device detection

## Configuration

The example uses these default settings:

- Provider Type: "embedded"
- Address Types: Solana + Ethereum
- API Base URL: Development environment
- Theme: Light mode

You can modify these in `App.tsx` to test different configurations.
