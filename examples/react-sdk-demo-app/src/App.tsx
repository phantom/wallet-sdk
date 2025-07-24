import { PhantomProvider } from "@phantom/react-sdk";
import { Actions } from "./Actions";

// Configuration for using the injected wallet (Phantom browser extension)
const config = {
  walletType: 'injected' as const,
  appName: 'React SDK Demo App'
};

function App() {
  return (
    <PhantomProvider config={config}>
      <Actions />
    </PhantomProvider>
  );
}

export default App;