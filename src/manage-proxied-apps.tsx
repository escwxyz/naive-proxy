// import { ActionPanel, Action, List, getApplications, showHUD } from "@raycast/api";
// import { useEffect, useState } from "react";
// import { execAsync, loadConfig, saveConfig } from "./libs/utils";
// import { ExtensionConfig } from "./types";
// import fs from "fs/promises";
// import { environment } from "@raycast/api";
// import path from "path";

// export default function Command() {
//   const [apps, setApps] = useState<{ name: string; path: string }[]>([]);
//   const [config, setConfig] = useState<ExtensionConfig | null>(null);

//   useEffect(() => {
//     async function loadApps() {
//       const allApps = await getApplications();
//       setApps(allApps);
//       const loadedConfig = await loadConfig();
//       setConfig(loadedConfig);
//     }
//     loadApps();
//   }, []);

//   async function toggleApp(appPath: string) {
//     if (!config) return;

//     let newProxiedApps: string[];
//     if (config.proxiedApps && config.proxiedApps.includes(appPath)) {
//       newProxiedApps = config.proxiedApps.filter((app) => app !== appPath);
//     } else {
//       newProxiedApps = [...(config.proxiedApps || []), appPath];
//     }

//     const newConfig = { ...config, proxiedApps: newProxiedApps };
//     await saveConfig(newConfig); // TODO save to localstorage
//     setConfig(newConfig);

//     // Update system proxy settings for this app
//     await updateAppProxySettings(appPath, newProxiedApps.includes(appPath));

//     await showHUD(`${newProxiedApps.includes(appPath) ? "Added" : "Removed"} app from proxy list`);
//   }

//   return (
//     <List>
//       {apps.map((app) => (
//         <List.Item
//           // TODO app icon
//           key={app.path}
//           title={app.name}
//           accessories={[{ text: config?.proxiedApps && config.proxiedApps.includes(app.path) ? "Proxy" : "Direct" }]}
//           actions={
//             <ActionPanel>
//               <Action
//                 title={
//                   config?.proxiedApps && config.proxiedApps.includes(app.path) ? "Remove from Proxy" : "Add to Proxy"
//                 }
//                 onAction={() => toggleApp(app.path)}
//               />
//             </ActionPanel>
//           }
//         />
//       ))}
//     </List>
//   );
// }

// // TODO
// async function updateAppProxySettings(appPath: string, useProxy: boolean): Promise<void> {
//   try {
//     const appName = path.basename(appPath, ".app");
//     const proxyPacFile = `${environment.supportPath}/${appName}_proxy.pac`;

//     if (useProxy) {
//       // Create a PAC file for this app
//       //   const pacContent = `
//       //     function FindProxyForURL(url, host) {
//       //       return "SOCKS5 ${host}:${port}; DIRECT";
//       //     }
//       //   `;
//       const pacContent = `
//     function FindProxyForURL(url, host) {
//     if (host === "localhost" || host === "127.0.0.1") {
//         return "DIRECT";
//       }
//       return "SOCKS5 127.0.0.1:1080; DIRECT";
//     }
//   `;
//       await fs.writeFile(proxyPacFile, pacContent);

//       // Set the proxy for this app using networksetup
//       await execAsync(`networksetup -setautoproxyurl "Wi-Fi" "file://${proxyPacFile}"`);
//       await execAsync(`networksetup -setproxyautodiscovery "Wi-Fi" on`);
//     } else {
//       // Remove the proxy settings for this app
//       await execAsync(`networksetup -setautoproxystate "Wi-Fi" off`);
//       // Optionally, remove the PAC file
//       await fs.unlink(proxyPacFile).catch(() => {}); // Ignore if file doesn't exist
//     }

//     console.log(`Updated proxy settings for ${appName}: ${useProxy ? "use proxy" : "don't use proxy"}`);
//   } catch (error) {
//     console.error(`Failed to update proxy settings for ${appPath}:`, error);
//     throw error;
//   }
// }
