import { LocalStorage } from "@raycast/api";
import { ExtensionConfig, NaiveProxyConfigJson } from "../types";
import { CONFIG_STORAGE_KEY } from "../contants";
import { readFile } from "fs/promises";
import fs from "fs";
import { isExecutable } from ".";
import { ExtensionConfigSchema, NaiveProxyConfigJsonSchema } from "../schema";

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

function validateNaiveExecutable(path: string) {
  if (!fs.existsSync(path) || !fs.lstatSync(path).isFile() || !isExecutable(path)) {
    throw new Error("Invalid NaiveProxy executable");
  }
}

// export async function parseConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
//   // choose what values shall be parsed and saved into local storage
//   try {
//     const validConfig = ExtensionConfigSchema.parse(config);
//   }
// }

export async function validateConfig(config: ExtensionConfig): Promise<ExtensionConfig> {
  try {
    const validatedConfig = ExtensionConfigSchema.parse(config);

    // Validate NaiveProxy executable
    const naive = validatedConfig.naiveProxyPath[0];
    validateNaiveExecutable(naive);

    let finalConfig: ExtensionConfig = {
      naiveProxyPath: [naive],
    };

    // Case 1: CLI args provided (overwrite config.json)
    if (validatedConfig.listen || validatedConfig.proxy) {
      finalConfig = {
        ...validatedConfig, // Include other fields from validatedConfig
        listen: validatedConfig.listen,
        proxy: validatedConfig.proxy,
      };
    }
    // Case 2: Fallback to config.json
    else if (validatedConfig.configFilePath && validatedConfig.configFilePath.length == 1) {
      const configPath = validatedConfig.configFilePath[0];
      if (!fs.existsSync(configPath) || !fs.lstatSync(configPath).isFile()) {
        throw new Error("Config file not found");
      }
      const configContent = fs.readFileSync(configPath, "utf8");
      const parsedFileConfig = JSON.parse(configContent) as NaiveProxyConfigJson;

      finalConfig = {
        ...parsedFileConfig,
        naiveProxyPath: [naive],
        listen: validatedConfig.listen || parsedFileConfig.listen,
        proxy: validatedConfig.proxy || parsedFileConfig.proxy,
      };
    } else {
      throw new Error("Either CLI args (listen and proxy) or a valid config file must be provided");
    }

    // Validate the final configuration
    return ExtensionConfigSchema.parse(finalConfig);
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
