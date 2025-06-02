import { getProvider } from "./getProvider";

type GetAccountResult =
  | {
      status: "connected";
      address: string;
    }
  | {
      status: "disconnected";
      address: null;
    };

export function getAccount(): GetAccountResult {
  const provider = getProvider();

  if (provider && provider.isConnected && provider.publicKey) {
    return {
      status: "connected",
      address: provider.publicKey.toString(),
    };
  }
  return {
    status: "disconnected",
    address: null,
  };
}
