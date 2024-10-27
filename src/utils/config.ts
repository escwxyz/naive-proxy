import { LocalStorage } from "@raycast/api";
import {
  ExtensionConfig,
  ExtensionConfigSchema,
  NaiveProxyConfig,
  NaiveProxyConfigJson,
  NaiveProxyConfigJsonSchema,
  NaiveProxyConfigSchema,
} from "../types";
import { CONFIG_STORAGE_KEY } from "../contants";
import { readFile } from "fs/promises";
import fs from "fs";
import { isExecutable } from ".";

export async function isConfigured(): Promise<boolean> {
  const config = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
  return config !== undefined && config !== null;
}

export async function loadConfig(): Promise<ExtensionConfig | null> {
  const config = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
  return config ? (JSON.parse(config) as ExtensionConfig) : null;
}

export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export async function validateConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
  try {
    const validatedConfig = ExtensionConfigSchema.parse(config);

    // Validate NaiveProxy executable
    const naive = validatedConfig.naiveProxyPath[0];
    if (!fs.existsSync(naive) || !fs.lstatSync(naive).isFile() || !isExecutable(naive)) {
      throw new Error("Invalid NaiveProxy executable");
    }

    // Case 1: CLI args provided
    if (validatedConfig.listen.length > 0 || validatedConfig.proxy) {
      const cliConfig: NaiveProxyConfig = {
        listen: validatedConfig.listen,
        proxy: validatedConfig.proxy,
      };
      NaiveProxyConfigSchema.parse(cliConfig);
    }

    // Case 2: Fallback to config.json
    else if (validatedConfig.configFilePath && validatedConfig.configFilePath.length > 0) {
      const configPath = validatedConfig.configFilePath[0];
      if (!fs.existsSync(configPath) || !fs.lstatSync(configPath).isFile()) {
        throw new Error("Config file not found");
      }
      const configContent = fs.readFileSync(configPath, "utf8");
      const parsedFileConfig = NaiveProxyConfigSchema.parse(JSON.parse(configContent));
      if (!parsedFileConfig.listen || !parsedFileConfig.proxy) {
        throw new Error("Config file must contain both 'listen' and 'proxy' fields");
      }
    } else {
      throw new Error("Either CLI args (listen and proxy) or a valid config file must be provided");
    }

    return validatedConfig;
  } catch (error) {
    console.error("Error validating config:", error);
    throw error;
  }
}

export async function readConfigFile(configFilePath: string[]): Promise<NaiveProxyConfigJson | null> {
  if (configFilePath.length > 0) {
    try {
      const configContent = await readFile(configFilePath[0], "utf-8");
      const parsedConfig = NaiveProxyConfigJsonSchema.parse(JSON.parse(configContent));
      return parsedConfig;
    } catch (error) {
      console.error("Error reading or parsing config file:", error);
      return null;
    }
  }
  return null;
}
