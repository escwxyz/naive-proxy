import { Form, ActionPanel, Action, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import { isExecutable, showErrorToast, showSuccessToast } from "./utils";
import { ExtensionConfig } from "./types";
import { z } from "zod";

const listenSchema = z.string().startsWith("socks://");

const proxySchema = z.string().startsWith("https://").or(z.string().startsWith("quic://"));

const logSchema = z.union([
  z.string().endsWith(".log"),
  z.string().max(0), // This allows an empty string
  z.undefined(), // This allows the field to be omitte
]);

const ConfigFileSchema = z.object({
  listen: listenSchema,
  proxy: proxySchema,
  log: logSchema,
});

const ConfigSchema = z.object({
  naiveProxyPath: z.array(z.string()).nonempty(),
  configFilePath: z.array(z.string()).optional(),
  proxy: z.string().optional(),
  listen: z.string().optional(),
  log: z.string().optional(),
});

export default function Command() {
  const [configValues, setConfigValues] = useState<ExtensionConfig>({
    naiveProxyPath: [],
    configFilePath: [],
    proxy: "",
    listen: "",
    log: "",
  });
  const { pop } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>("naiveProxyConfig").then((savedConfig) => {
      if (savedConfig) {
        try {
          const parsedConfig = ConfigSchema.parse(JSON.parse(savedConfig));

          // console.debug("Parsed config:", parsedConfig);

          setConfigValues(parsedConfig);
        } catch (error) {
          console.error("Invalid saved configuration:", error);
          showErrorToast("Configuration Error", "Saved configuration is invalid. Using default values.");
        }
      }
    });
  }, []);

  async function handleSubmit(values: ExtensionConfig) {
    try {
      const validatedConfig = ConfigSchema.parse(values);

      const naive = validatedConfig.naiveProxyPath[0];
      if (!fs.existsSync(naive)) {
        throw new Error("NaiveProxy executable not found");
      }
      if (!fs.lstatSync(naive).isFile()) {
        throw new Error("NaiveProxy path is not a file");
      }
      if (!(await isExecutable(naive))) {
        throw new Error("NaiveProxy file is not executable");
      }

      if (validatedConfig.configFilePath && validatedConfig.configFilePath.length > 0) {
        const configPath = validatedConfig.configFilePath[0];
        if (!fs.existsSync(configPath) || !fs.lstatSync(configPath).isFile()) {
          throw new Error("Config file not found");
        }

        const configContent = fs.readFileSync(configPath, "utf8");
        try {
          ConfigFileSchema.parse(JSON.parse(configContent));
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(`Invalid config file content: ${error.errors[0].message}`);
          } else {
            throw new Error("Invalid config file content");
          }
        }
      } else if (!validatedConfig.proxy || !validatedConfig.listen) {
        throw new Error("Proxy and listen are required when no config file is provided");
      } else {
        try {
          proxySchema.parse(validatedConfig.proxy);
          listenSchema.parse(validatedConfig.listen);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(`Invalid ${error.errors[0].path[0]} format: ${error.errors[0].message}`);
          }
        }
      }

      await LocalStorage.setItem("naiveProxyConfig", JSON.stringify(validatedConfig));
      showSuccessToast("Configuration saved", "NaiveProxy settings have been updated");
      pop();
    } catch (error) {
      if (error instanceof z.ZodError) {
        showErrorToast("Validation Error", error.errors[0].message);
      } else if (error instanceof Error) {
        showErrorToast("Configuration Error", error.message);
      } else {
        showErrorToast("Unknown Error", "An unexpected error occurred");
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure NaïveProxy settings" />
      <Form.FilePicker
        id="naiveProxyPath"
        title="NaiveProxy Path"
        allowMultipleSelection={false}
        value={configValues.naiveProxyPath}
        onChange={(newValue) => setConfigValues({ ...configValues, naiveProxyPath: newValue })}
      />
      <Form.FilePicker
        id="configFilePath"
        title="Config File Path (optional)"
        allowMultipleSelection={false}
        value={configValues.configFilePath}
        onChange={(newValue) => setConfigValues({ ...configValues, configFilePath: newValue })}
      />
      <Form.Separator />
      <Form.Description text="Following fields are optional if a config file is provided" />
      <Form.TextField
        id="listen"
        title="Listen"
        placeholder="socks://127.0.0.1:1080"
        value={configValues.listen}
        onChange={(newValue) => setConfigValues({ ...configValues, listen: newValue })}
      />
      <Form.TextField
        id="proxy"
        title="Proxy"
        placeholder="https://user:password@example.com"
        value={configValues.proxy}
        onChange={(newValue) => setConfigValues({ ...configValues, proxy: newValue })}
      />
      <Form.TextField
        id="log"
        title="Log"
        placeholder="path/to/logfile.log"
        value={configValues.log}
        onChange={(newValue) => setConfigValues({ ...configValues, log: newValue })}
      />
    </Form>
  );
}
