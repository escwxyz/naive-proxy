import { showToast, Toast } from "@raycast/api";
import fs from "fs/promises";
import { LocalStorage } from "@raycast/api";
import { promisify } from "util";
import { exec } from "child_process";
import { ExtensionConfig } from "./types";
import { runAppleScript } from "run-applescript";

export const execAsync = promisify(exec);

export const CONFIG_STORAGE_KEY = "naiveProxyConfig";

export async function showSuccessToast(title: string, message?: string) {
  await showToast({ title, message, style: Toast.Style.Success });
}

export async function showErrorToast(title: string, message?: string) {
  await showToast({ title, message, style: Toast.Style.Failure });
}

export async function isExecutable(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}

export async function isConfigured(): Promise<boolean> {
  const config = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
  return config !== undefined && config !== null;
}

export async function loadConfig(): Promise<ExtensionConfig | null> {
  const config = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);
  return config ? JSON.parse(config) : null;
}

export async function setSystemProxy(enable: boolean, host: string, port: string): Promise<void> {
  try {
    const script = `
      set proxyState to "${enable ? "on" : "off"}"
      set proxyHost to "${host}"
      set proxyPort to ${port}

      tell application "System Events"
        tell current location of network preferences
          set serviceList to every service
          repeat with currentService in serviceList
            if proxyState is "on" then
              set socks proxy of currentService to "{proxyHost}"
              set socks port of currentService to proxyPort
              set socks proxy enabled of currentService to true
            else
              set socks proxy enabled of currentService to false
            end if
          end repeat
        end tell
      end tell
    `;

    await runAppleScript(script);
    console.debug(`System proxy ${enable ? "enabled" : "disabled"}`);
  } catch (error) {
    console.error("Failed to set system proxy:", error);
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

export async function setProxyEnvVars(host: string, port: string): Promise<void> {
  const proxyUrl = `socks5://${host}:${port}`;
  const envVars = [
    `export ALL_PROXY="${proxyUrl}"`,
    `export HTTP_PROXY="${proxyUrl}"`,
    `export HTTPS_PROXY="${proxyUrl}"`,
    `export NO_PROXY="localhost,127.0.0.1,::1"`,
  ];

  const zshrcPath = `${process.env.HOME}/.zshrc`;
  await fs.appendFile(zshrcPath, `\n${envVars.join("\n")}\n`);
}

export async function clearProxyEnvVars(): Promise<void> {
  const envVarsToClear = ["ALL_PROXY", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"];

  const zshrcPath = `${process.env.HOME}/.zshrc`;
  let content = await fs.readFile(zshrcPath, "utf8");

  envVarsToClear.forEach((varName) => {
    content = content.replace(new RegExp(`^export ${varName}=.*$`, "gm"), "");
  });

  await fs.writeFile(zshrcPath, content);
}
