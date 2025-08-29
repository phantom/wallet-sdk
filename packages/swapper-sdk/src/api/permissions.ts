import type { PermissionsResponse } from "../types";
import type { SwapperAPIClient } from "./client";

export class PermissionsAPI {
  constructor(private client: SwapperAPIClient) {}

  async getPermissions(): Promise<PermissionsResponse> {
    return this.client.get<PermissionsResponse>("/permissions");
  }
}