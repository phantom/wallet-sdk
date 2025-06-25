import { PhantomProvider } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { createAutoConfirmPlugin } from "@phantom/browser-sdk/auto-confirm";
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
