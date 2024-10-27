import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import { setSystemProxy, loadConfig, checkIfProxyIsRunning, showErrorToast, parseArgs } from "./utils";
import { match, P } from "ts-pattern";

export default async function Command() {
  const isRunning = await checkIfProxyIsRunning();
  if (isRunning) {
    await showHUD("NaiveProxy is already running");
    return;
  }

  const config = await loadConfig();
  if (!config) {
    await showHUD("NaiveProxy configuration not found");
    await launchCommand({ name: "config-naive-proxy", type: LaunchType.UserInitiated });
    return;
  }

  const { naiveProxyPath } = config;

  console.debug("config:\n", config);

  const args = await parseArgs(config);

  console.debug("args:\n", args);

  match(args)
    .with([P.string, P.string], async ([listen, proxy]) => {
      console.debug("Starting NaiveProxy with args:", [listen, proxy]);
      const process = spawn(naiveProxyPath[0], [listen, proxy], { detached: true, stdio: "ignore" });
      process.unref();
      console.debug("NaiveProxy process started:", process.pid);
      const listenParts = listen.split(":");
      if (listenParts && listenParts.length === 3) {
        const [, host, port] = listenParts;
        console.debug("Setting system proxy:", host, port);
        await setSystemProxy(true, host, port);
      } else {
        console.debug("Invalid or missing listen configuration:", listen);
      }

      await showHUD("NaiveProxy started");
      await launchCommand({ name: "toggle-naive-proxy", type: LaunchType.Background });
    })
    .otherwise(async () => {
      await showErrorToast("No valid args configuration available");
      await launchCommand({ name: "config-naive-proxy", type: LaunchType.UserInitiated });
    });
}
