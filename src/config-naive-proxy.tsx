import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { ExtensionConfig } from "./types";
import { ConfigFileSchema, ExtensionConfigSchema, listenUriSchema, NaiveExecutableSchema, proxySchema } from "./schema";
import { z } from "zod";
import { showErrorToast, showSuccessToast } from "./utils";
import { useForm } from "@raycast/utils";

import { useExtensionConfig } from "./hooks/useExtensionConfig";

export default function Command() {
  const { config, isLoading, setConfig, error } = useExtensionConfig();

  console.debug("initial conifg:\n", config);

  useEffect(() => {
    if (error) {
      showErrorToast("Something went wrong", error);
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<ExtensionConfig>({
    onSubmit: async (values) => {
      try {
        const cleanedValues = cleanFormValues(values);
        console.debug("cleaned values:\n", cleanedValues);
        await setConfig(cleanedValues);
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
    },
    initialValues: config,
    validation: {
      naiveProxyPath: (value) => {
        const result = NaiveExecutableSchema.safeParse(value);
        if (!result.success) {
          return result.error.errors[0].message;
        }
      },
      configFilePath: (value) => {
        // Case 1: Config file is provided
        if (value && value.length === 1) {
          const result = ConfigFileSchema.safeParse(value);
          if (!result.success) {
            return result.error.errors[0].message;
          }
          return; // Config file is valid
        }

        // Case 2: No config file, validate direct configuration
        const partialConfig = {
          naiveProxyPath: itemProps.naiveProxyPath.value,
          listen: itemProps.listen?.value,
          proxy: itemProps.proxy?.value,
        };

        const result = ExtensionConfigSchema.safeParse(partialConfig);
        if (!result.success) {
          // Find relevant error messages for missing direct configuration
          const errors = result.error.errors.filter((err) => err.path.includes("listen") || err.path.includes("proxy"));
          if (errors.length > 0) {
            return errors[0].message;
          }
        }
      },
      listen: (value) => {
        if (value) {
          const result = listenUriSchema.safeParse(value);
          if (!result.success) {
            return result.error.errors[0].message;
          }
        } else if (!itemProps.configFilePath?.value?.length) {
          // required if no config file is provided
          return "Listen is required when not using a config file";
        }
      },
      proxy: (value) => {
        if (value) {
          const result = proxySchema.safeParse(value);
          if (!result.success) {
            return result.error.errors[0].message;
          }
        } else if (!itemProps.configFilePath?.value?.length) {
          // required if no config file is provided
          return "Proxy is required when not using a config file";
        }
      },
    },
  });

  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure NaïveProxy settings" />
      <Form.FilePicker
        title="NaiveProxy Path"
        allowMultipleSelection={false}
        {...itemProps.naiveProxyPath}
        storeValue
      />
      <Form.FilePicker
        title="Config File Path (optional)"
        allowMultipleSelection={false}
        {...itemProps.configFilePath}
        storeValue
      />

      <Form.Separator />
      <Form.Description text="Direct Configuration (required when no config file is provided, will override the config file)" />
      <Form.TextField title="Listen" placeholder="e.g., socks://127.0.0.1:1080" {...itemProps.listen} storeValue />
      <Form.PasswordField
        title="Proxy"
        placeholder="e.g., https://user:password@example.com"
        {...itemProps.proxy}
        storeValue
      />
    </Form>
  );
}

// Helper function to clean form values
const cleanFormValues = (values: ExtensionConfig): ExtensionConfig => {
  const cleaned: Partial<ExtensionConfig> = {
    naiveProxyPath: values.naiveProxyPath,
  };

  // Only include configFilePath if it has a value
  if (values.configFilePath?.length) {
    cleaned.configFilePath = values.configFilePath;
  }

  // Only include listen and proxy if they have non-empty values
  if (values.listen?.trim()) {
    cleaned.listen = values.listen.trim();
  }

  if (values.proxy?.trim()) {
    cleaned.proxy = values.proxy.trim();
  }

  return cleaned as ExtensionConfig;
};
