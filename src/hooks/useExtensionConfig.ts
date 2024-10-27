import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { ExtensionConfig } from "../types";
import { CONFIG_STORAGE_KEY } from "../contants";
import { ExtensionConfigSchema } from "../schema";

const defaultConfig: ExtensionConfig = {
  naiveProxyPath: [],
};

export function useExtensionConfig() {
  const [config, setConfig] = useState<ExtensionConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the configuration from Raycast LocalStorage when the component mounts
    loadConfig();
  }, []);

  const loadConfig = async () => {
    console.debug("loading config...");
    setIsLoading(true);
    setError(null);
    try {
      const storedConfig = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
      if (storedConfig) {
        console.debug("Found stored config...");
        const parsedConfig = JSON.parse(storedConfig) as ExtensionConfig;
        const validatedConfig = ExtensionConfigSchema.parse(parsedConfig);
        console.log("loaded cofnig...\n", validatedConfig);
        setConfig(validatedConfig);
      } else {
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error("Error loading extension config:", err);
      setError("Failed to load configuration");
      setConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: ExtensionConfig) => {
    console.debug("saving config...");
    setIsLoading(true);
    setError(null);
    try {
      const validatedConfig = ExtensionConfigSchema.parse(newConfig);
      console.debug("validatedconfig:\n", validatedConfig);
      await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(validatedConfig));
      setConfig(validatedConfig);
    } catch (err) {
      console.error("Error saving extension config:", err);
      setError("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    config,
    setConfig: saveConfig,
    isLoading,
    error,
    reloadConfig: loadConfig,
  };
}
