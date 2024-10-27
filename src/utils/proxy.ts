import { runAppleScript } from "run-applescript";
import fs from "fs/promises";
import path from "path";
import { environment } from "@raycast/api";

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

export async function updateAppProxySettings(
  appPath: string,
  useProxy: boolean,
  host: string,
  port: string,
): Promise<void> {
  try {
    const appName = path.basename(appPath, ".app");
    const proxyPacFile = `${environment.supportPath}/${appName}_proxy.pac`;

    if (useProxy) {
      // Create a PAC file for this app
      const pacContent = `
          function FindProxyForURL(url, host) {
            if (host === "localhost" || host === "127.0.0.1") {
              return "DIRECT";
            }
            return "SOCKS5 ${host}:${port}; DIRECT";
          }
        `;
      await fs.writeFile(proxyPacFile, pacContent);

      // Set the proxy using AppleScript
      const script = `
          tell application "System Events"
            tell current location of network preferences
              set proxySettings to get proxy settings of current location
              set autoproxyurl of proxySettings to "file://${proxyPacFile}"
              set autoproxyenabled of proxySettings to true
            end tell
          end tell
        `;
      await runAppleScript(script);
    } else {
      // Remove the proxy settings using AppleScript
      const script = `
          tell application "System Events"
            tell current location of network preferences
              set proxySettings to get proxy settings of current location
              set autoproxyenabled of proxySettings to false
            end tell
          end tell
        `;
      await runAppleScript(script);

      // Remove the PAC file
      await fs.unlink(proxyPacFile).catch(() => {}); // Ignore if file doesn't exist
    }

    console.debug(`Updated proxy settings for ${appName}: ${useProxy ? "use proxy" : "don't use proxy"}`);
  } catch (error) {
    console.error(`Failed to update proxy settings for ${appPath}:`, error);
    throw error;
  }
}

// export async function setProxyEnvVars(host: string, port: string): Promise<void> {
//   const proxyUrl = `socks5://${host}:${port}`;
//   const envVars = [
//     `export ALL_PROXY="${proxyUrl}"`,
//     `export HTTP_PROXY="${proxyUrl}"`,
//     `export HTTPS_PROXY="${proxyUrl}"`,
//     `export NO_PROXY="localhost,127.0.0.1,::1"`,
//   ];

//   const zshrcPath = `${process.env.HOME}/.zshrc`;
//   await fs.appendFile(zshrcPath, `\n${envVars.join("\n")}\n`);
// }

// export async function clearProxyEnvVars(): Promise<void> {
//   const envVarsToClear = ["ALL_PROXY", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"];

//   const zshrcPath = `${process.env.HOME}/.zshrc`;
//   let content = await fs.readFile(zshrcPath, "utf8");

//   envVarsToClear.forEach((varName) => {
//     content = content.replace(new RegExp(`^export ${varName}=.*$`, "gm"), "");
//   });

//   await fs.writeFile(zshrcPath, content);
// }
