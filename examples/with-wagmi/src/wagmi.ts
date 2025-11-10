import { createConfig } from "wagmi";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { phantomConnector } from "./phantom-connector";

// Create wagmi configuration with Phantom connector
export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [phantomConnector()],
});
