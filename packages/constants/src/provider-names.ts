export type ProviderNameKey = "google" | "apple" | "x" | "tiktok" | "phantom" | "device" | "injected";

export const PROVIDER_NAMES: Record<ProviderNameKey, string> = {
  google: "Google",
  apple: "Apple",
  x: "X",
  tiktok: "TikTok",
  phantom: "Phantom",
  device: "Device",
  injected: "Wallet",
} as const;

export function getProviderName(provider: ProviderNameKey | string): string {
  return PROVIDER_NAMES[provider as ProviderNameKey] || "Wallet";
}
