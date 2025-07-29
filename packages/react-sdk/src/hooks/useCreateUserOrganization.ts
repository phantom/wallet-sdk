import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";
import type { CreateUserOrganizationParams, CreateUserOrganizationResult } from "@phantom/browser-sdk";

export function useCreateUserOrganization() {
  const { sdk } = usePhantom();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createUserOrganization = useCallback(
    async (params: CreateUserOrganizationParams): Promise<CreateUserOrganizationResult> => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      setIsCreating(true);
      setError(null);

      try {
        const result = await sdk.createUserOrganization(params);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [sdk],
  );

  return {
    createUserOrganization,
    isCreating,
    error,
  };
}
