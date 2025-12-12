export type ProviderNameKey = "google" | "apple" | "phantom" | "device" | "injected" | "deeplink";

export const PROVIDER_NAMES: Record<ProviderNameKey, string> = {
  google: "Google",
  apple: "Apple",
  phantom: "Phantom",
  device: "Device",
  injected: "Wallet",
  deeplink: "Deeplink",
} as const;

export function getProviderName(provider: ProviderNameKey | string): string {
  return PROVIDER_NAMES[provider as ProviderNameKey] || "Wallet";
}
