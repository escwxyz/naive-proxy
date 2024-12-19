// import { useEffect, useState } from "react";
// import { Icon, MenuBarExtra, showHUD, launchCommand, LaunchType } from "@raycast/api";
// import { loadConfig, checkIfProxyIsRunning } from "./utils";
// import type { ProxyState } from "./types";

// // const useProxyState = () => {
// //   const [state, setState] = useState<ProxyState>({
// //     isRunning: false,
// //     config: null,
// //     isLoading: true,
// //   });

// //   useEffect(() => {
// //     (async () => {
// //       const config = await loadConfig();
// //       console.debug("Loaded config:", config);
// //       const isRunning = await checkIfProxyIsRunning();
// //       setState({ config, isRunning, isLoading: false });
// //     })();
// //   }, []);

// //   return { state, setState };
// // };

// export default function Command() {
//   const [state, setState] = useState<ProxyState>({
//     isRunning: false,
//     config: null,
//     isLoading: false,
//   });

//   useEffect(() => {
//     const initializeState = async () => {
//       const config = await loadConfig();

//       if (!config) {
//         console.debug("No config found, showing configuration menu item");
//         launchCommand({ name: "config-naive-proxy", type: LaunchType.UserInitiated });
//       }
//       const isRunning = await checkIfProxyIsRunning();
//       setState({ config, isRunning, isLoading: false });
//     };
//     initializeState().catch(console.error);
//   }, []);

//   const toggleProxy = async () => {
//     console.debug("Toggling proxy. Current state:", state.isRunning);
//     if (state.isRunning) {
//       await stopProxy(state, setState);
//     } else {
//       await startProxy(state, setState);
//     }
//   };

//   if (!state.config) {
//     // TODO this is buggy, why config is not loaded?
//     console.debug("No config found, showing configuration menu item");
//     // launchCommand({ name: "config-naive-proxy", type: LaunchType.UserInitiated });
//   }

//   return (
//     <MenuBarExtra
//       icon={state.isRunning ? Icon.CircleFilled : Icon.Circle}
//       tooltip={state.isRunning ? "NaiveProxy is running" : "NaiveProxy is stopped"}
//     >
//       <MenuBarExtra.Item
//         title={state.isRunning ? "Turn Off NaiveProxy" : "Turn On NaiveProxy"}
//         onAction={toggleProxy}
//       />
//       <MenuBarExtra.Item
//         title="Open Configuration"
//         onAction={() => launchCommand({ name: "config-naive-proxy", type: LaunchType.UserInitiated })}
//       />
//       <MenuBarExtra.Section />
//       {/* <MenuBarExtra.Item
//         title="Quit"
//         onAction={() => process.exit(0)}
//       /> */}
//     </MenuBarExtra>
//   );
// }

// async function startProxy(state: ProxyState, setState: React.Dispatch<React.SetStateAction<ProxyState>>) {
//   try {
//     await launchCommand({ name: "start-naive-proxy", type: LaunchType.Background });
//     setState((prevState) => ({ ...prevState, isRunning: true }));
//   } catch (error) {
//     console.error("Failed to start NaiveProxy:", error);
//     await showHUD("Failed to start NaiveProxy");
//   }
// }

// async function stopProxy(state: ProxyState, setState: React.Dispatch<React.SetStateAction<ProxyState>>) {
//   try {
//     await launchCommand({ name: "stop-naive-proxy", type: LaunchType.Background });
//     setState((prevState) => ({ ...prevState, isRunning: false }));
//   } catch (error) {
//     console.error("Failed to stop NaiveProxy:", error);
//     await showHUD("Failed to stop NaiveProxy");
//   }
// }
