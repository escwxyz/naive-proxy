import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import { checkIfProxyIsRunning, execAsync, loadConfig, setSystemProxy } from "./utils";

export default async function Command() {
  try {
    const config = await loadConfig();
    if (!config || !config.naiveProxyPath || config.naiveProxyPath.length === 0) {
      console.debug("No valid NaiveProxy path found in config");
      throw new Error("Invalid NaiveProxy configuration");
    }

    // check if proxy is running
    const isRunning = await checkIfProxyIsRunning();
    if (!isRunning) {
      await showHUD("NaiveProxy is not running");
      return;
    }

    const naiveProxyPath = config.naiveProxyPath[0];
    console.debug("Stopping NaiveProxy process with path:", naiveProxyPath);

    // Find the process ID
    const { stdout: psOutput } = await execAsync(`ps aux | grep "${naiveProxyPath}" | grep -v grep`);
    const lines = psOutput.trim().split("\n");

    if (lines.length === 0) {
      console.debug("No running NaiveProxy process found");
      throw new Error("NaiveProxy process not found");
    }

    // Extract the PID (second column in ps output)
    const pid = lines[0].split(/\s+/)[1];
    console.debug("Found NaiveProxy process with PID:", pid);

    // Kill the process
    await execAsync(`kill ${pid}`);
    console.debug("Sent kill signal to NaiveProxy process");

    // Wait a bit to ensure the process has been terminated
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the process has been terminated
    const { stdout: checkOutput } = await execAsync(`ps -p ${pid} || true`);
    if (checkOutput.trim().length > 0) {
      console.debug("NaiveProxy process still running, attempting force kill");
      await execAsync(`kill -9 ${pid}`);
    }

    await setSystemProxy(false, "", "");
    // TODO: disable this for now
    // await clearProxyEnvVars();
    await showHUD("NaiveProxy stopped");
    await launchCommand({ name: "toggle-naive-proxy", type: LaunchType.Background });
  } catch (error) {
    console.error("Failed to stop NaiveProxy:", error);
    await showHUD("Failed to stop NaiveProxy");
  }
}
