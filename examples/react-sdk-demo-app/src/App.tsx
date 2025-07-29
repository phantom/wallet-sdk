import { PhantomProvider } from "@phantom/react-sdk";
import { Actions } from "./Actions";

// Configuration supporting both embedded and injected providers
const config = {
  appName: "React SDK Demo App",
  serverUrl: "http://localhost:3000/api", // Required for embedded provider
  providerType: "injected", // Default provider type
};

function App() {
  return (
    <PhantomProvider config={config}>
      <Actions />
    </PhantomProvider>
  );
}

export default App;
