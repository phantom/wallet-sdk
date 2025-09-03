import { Linking } from "react-native";
import type { URLParamsAccessor } from "@phantom/embedded-provider-core";

export class ExpoURLParamsAccessor implements URLParamsAccessor {
  private listeners: Set<(params: Record<string, string>) => void> = new Set();
  private currentParams: Record<string, string> = {};

  getParam(key: string): string | null {
    return this.currentParams[key] || null;
  }

  async getInitialParams(): Promise<Record<string, string> | null> {
    try {
      const url = await Linking.getInitialURL();
      if (!url) {
        return null;
      }

      const params = this.parseURLParams(url);
      this.currentParams = params;
      return params;
    } catch (error) {
      console.error("[ExpoURLParamsAccessor] Failed to get initial URL", error);
      return null;
    }
  }

  addListener(callback: (params: Record<string, string>) => void): () => void {
    this.listeners.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private parseURLParams(url: string): Record<string, string> {
    try {
      const parsed = new URL(url);
      const params: Record<string, string> = {};

      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return params;
    } catch (error) {
      console.error("[ExpoURLParamsAccessor] Failed to parse URL", url, error);
      return {};
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}
