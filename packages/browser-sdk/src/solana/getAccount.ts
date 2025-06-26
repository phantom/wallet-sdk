import { getProvider } from "./getProvider";

export async function getAccount(): Promise<string | undefined> {
  const provider = await getProvider();
  return provider.getAccount();
}
