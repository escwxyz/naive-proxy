import { ExtensionConfigSchema, NaiveProxyConfigJsonSchema, NaiveProxyConfigSchema } from "./schema";
import { z } from "zod";

// Type exports
export type NaiveProxyConfigJson = z.infer<typeof NaiveProxyConfigJsonSchema>;
export type NaiveProxyConfig = z.infer<typeof NaiveProxyConfigSchema>;
export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

export interface ProxyState {
  isRunning: boolean;
  config: ExtensionConfig | null;
  isLoading: boolean;
}
