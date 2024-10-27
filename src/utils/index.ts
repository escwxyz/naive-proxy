import { exec } from "child_process";
import { promisify } from "util";
import { loadConfig, readConfigFile } from "./config";
import { match, P } from "ts-pattern";
import { ExtensionConfig } from "../types";
import fs from "fs";
import { constants } from "fs";

export * from "./config";
export * from "./toast";
export * from "./proxy";

export const execAsync = promisify(exec);

export function isExecutable(path: string): boolean {
  try {
    fs.accessSync(path, constants.X_OK);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EACCES") {
      return false;
    }
    throw error;
  }
}

export async function checkIfProxyIsRunning(): Promise<boolean> {
  try {
    const config = await loadConfig();
    if (!config || !config.naiveProxyPath || config.naiveProxyPath.length === 0) {
      console.debug("No valid NaiveProxy path found in config");
      return false;
    }

    const naiveProxyPath = config.naiveProxyPath[0];
    console.debug("Checking for NaiveProxy process with path:", naiveProxyPath);

    const { stdout } = (await execAsync(`pgrep -f "${naiveProxyPath}"`)) || { stdout: "" };

    const isRunning = stdout.trim().length > 0;
    console.debug("NaiveProxy process running:", isRunning);

    return isRunning;
  } catch (error) {
    console.debug("NaiveProxy process not running");
    return false;
  }
}

type ListenArg = `--listen=${string}`;
type ProxyArg = `--proxy=${string}`;
type ArgsTuple = [ListenArg, ProxyArg];

export async function parseArgs(config: ExtensionConfig): Promise<ArgsTuple | null> {
  return await match(config)
    .with({ listen: P.string, proxy: P.string }, async ({ listen, proxy }): Promise<ArgsTuple> => {
      console.debug("listen and proxy are set");
      return [`--listen=${listen}`, `--proxy=${proxy}`];
    })
    .with(
      {
        listen: P.string,
        proxy: P.nullish,
        configFilePath: P.when((path): path is string[] => Array.isArray(path) && path.length == 1),
      },
      async ({ listen, configFilePath }): Promise<ArgsTuple | null> => {
        console.debug("listen and configFilePath are set");
        const path = configFilePath as string[];
        const fileConfig = await readConfigFile(path);
        return fileConfig?.proxy ? [`--listen=${listen}`, `--proxy=${fileConfig.proxy}`] : null;
      },
    )
    .with(
      { proxy: P.string, configFilePath: P.array(P.string) },
      async ({ proxy, configFilePath }): Promise<ArgsTuple | null> => {
        console.debug("proxy and configFilePath are set");
        const fileConfig = await readConfigFile(configFilePath);
        return fileConfig?.listen ? [`--listen=${fileConfig.listen}`, `--proxy=${proxy}`] : null;
      },
    )
    .with({ configFilePath: P.array(P.string) }, async ({ configFilePath }): Promise<ArgsTuple | null> => {
      const fileConfig = await readConfigFile(configFilePath);
      console.debug("fileConfig:\n", fileConfig);
      return fileConfig?.listen && fileConfig?.proxy
        ? [`--listen=${fileConfig.listen}`, `--proxy=${fileConfig.proxy}`]
        : null;
    })
    .otherwise(() => {
      console.error("No valid configuration");
      return null;
    });
}
