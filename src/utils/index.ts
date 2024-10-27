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
type LogArg = `--log=${string}`;
type Args = [ListenArg, ProxyArg, LogArg?]; // TODO add more args

export async function parseArgs(config: ExtensionConfig): Promise<Args | null> {
  return await match(config)
    .with(
      {
        listen: P.string,
        proxy: P.string,
        log: P.optional(P.string),
      },
      async ({ listen, proxy, log }): Promise<Args> => {
        const args: string[] = [`--listen=${listen}`, `--proxy=${proxy}`];
        if (log) args.push(`--log=${log}`);
        return args as Args;
      },
    )
    .with(
      {
        configFilePath: P.when((path): path is string[] => Array.isArray(path) && path.length === 1),
      },
      async ({ configFilePath }): Promise<Args | null> => {
        const fileConfig = await readConfigFile(configFilePath);
        if (!fileConfig?.listen || !fileConfig?.proxy) return null;

        const args: string[] = [`--listen=${fileConfig.listen}`, `--proxy=${fileConfig.proxy}`];
        if (fileConfig.log) args.push(`--log=${fileConfig.log}`);
        return args as Args;
      },
    )
    .with(
      {
        configFilePath: P.when((path): path is string[] => Array.isArray(path) && path.length === 1),
        listen: P.optional(P.string),
        proxy: P.optional(P.string),
        log: P.optional(P.string),
      },
      async ({ configFilePath, listen, proxy, log }): Promise<Args | null> => {
        const fileConfig = await readConfigFile(configFilePath);
        if (!fileConfig) return null;

        const effectiveListen = listen || fileConfig.listen;
        const effectiveProxy = proxy || fileConfig.proxy;
        const effectiveLog = log || fileConfig.log;

        if (!effectiveListen || !effectiveProxy) return null;

        const args: string[] = [`--listen=${effectiveListen}`, `--proxy=${effectiveProxy}`];
        if (effectiveLog) args.push(`--log=${effectiveLog}`);
        return args as Args;
      },
    )
    .otherwise(() => {
      console.error("No valid configuration");
      return null;
    });
}
