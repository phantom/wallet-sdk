import { getProvider } from "./getProvider";

type GetAccountResult =
  | {
      status: "connected";
      publicKey: string;
    }
  | {
      status: "disconnected";
      publicKey: null;
    };

export function getAccount(): GetAccountResult {
  const provider = getProvider();

  if (provider && provider.isConnected && provider.publicKey) {
    return {
      status: "connected",
      publicKey: provider.publicKey.toString(),
    };
  }
  return {
    status: "disconnected",
    publicKey: null,
  };
}
