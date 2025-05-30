import { PhantomProvider } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";
import { Actions } from "./Actions";

const phantomConfig = {
  chainPlugins: [createSolanaPlugin()],
};

function App() {
  return (
    <PhantomProvider config={phantomConfig}>
      <Actions />
    </PhantomProvider>
  );
}

export default App;
