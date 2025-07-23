import { PhantomProvider } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-injected-sdk/solana";
import { createAutoConfirmPlugin } from "@phantom/browser-injected-sdk/auto-confirm";
import { Actions } from "./Actions";

const phantomConfig = {
  plugins: [createSolanaPlugin(), createAutoConfirmPlugin()],
};

function App() {
  return (
    <PhantomProvider config={phantomConfig}>
      <Actions />
    </PhantomProvider>
  );
}

export default App;
