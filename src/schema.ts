import { z } from "zod";
import fs from "fs";
import { isExecutable } from "./utils";
import path from "path";

const nonEmptyString = z.string().min(1, "Cannot be empty");
const positiveInteger = z.number().int().positive();

export const listenUriSchema = z
  .string()
  .superRefine((val, ctx) => {
    // Basic format validation
    const formatMatch = val.match(/^(socks|http|redir):\/\/(([^:@]+:[^@]+@)?([^:@]*)(:\d{1,5})?)?$/);
    if (!formatMatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid listen URI format",
        path: [],
      });
      return;
    }

    const [proto, rest] = val.split("://");

    // Validate protocol
    if (!["socks", "http", "redir"].includes(proto)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Protocol must be 'socks', 'http', or 'redir'",
        path: [],
      });
      return;
    }

    // Validate port if present
    if (rest) {
      const parts = rest.split("@");
      const hostPart = parts.length > 1 ? parts[1] : parts[0];
      const [, port] = hostPart.split(":");

      if (port) {
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Port must be between 1 and 65535",
            path: [],
          });
          return;
        }
      }
    }
  })
  .transform((val) => {
    const [proto, rest] = val.split("://");

    // If only protocol is provided or empty rest
    if (!rest || rest === "" || rest === "/") {
      return `${proto}://0.0.0.0:1080`;
    }

    const parts = rest.split("@");
    const hostPart = parts.length > 1 ? parts[1] : parts[0];
    const [host, port] = hostPart.split(":");

    // Add default host and port if needed
    const finalHost = host || "0.0.0.0";
    const finalPort = port || "1080";

    // Reconstruct URI with defaults
    return parts.length > 1
      ? `${proto}://${parts[0]}@${finalHost}:${finalPort}`
      : `${proto}://${finalHost}:${finalPort}`;
  });

// SOCKS-PROXY schema
const socksProxySchema = z.string().superRefine((val, ctx) => {
  // Basic format validation
  const formatMatch = val.match(/^socks:\/\/[^:]+?(:\d{1,5})?$/);
  if (!formatMatch) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid SOCKS proxy format. Must be socks://<HOSTNAME>[:<PORT>]",
      path: [],
    });
    return;
  }

  const parts = val.split(":");
  if (parts.length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid SOCKS proxy format",
      path: [],
    });
    return;
  }

  // Validate port if present
  if (parts.length === 3) {
    const port = parseInt(parts[2]);
    if (isNaN(port) || port < 1 || port > 65535) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Port must be between 1 and 65535",
        path: [],
      });
    }
  }
});
// PROXY-CHAIN schema
const proxyChainSchema = z.string().superRefine((val, ctx) => {
  const formatMatch = val.match(
    /^(http|https|quic):\/\/(([^:@]+:[^@]+@)?[^:@]+?(:\d{1,5})?)(,(http|https|quic):\/\/(([^:@]+:[^@]+@)?[^:@]+?(:\d{1,5})?)){0,}$/,
  );
  if (!formatMatch) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid proxy chain format",
      path: [],
    });
    return;
  }

  const uris = val.split(",");
  uris.forEach((uri, index) => {
    if (uri === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Empty proxy URI in chain",
        path: [index],
      });
      return;
    }

    const [proto, rest] = uri.split("://");

    if (!["http", "https", "quic"].includes(proto)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid protocol '${proto}' at position ${index + 1}. Must be 'http', 'https', or 'quic'`,
        path: [index],
      });
      return;
    }

    if (!rest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing host at position ${index + 1}`,
        path: [index],
      });
      return;
    }

    const parts = rest.split("@");
    const hostPart = parts.length > 1 ? parts[1] : parts[0];
    const [host, port] = hostPart.split(":");

    if (!host) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing host at position ${index + 1}`,
        path: [index],
      });
      return;
    }

    if (port) {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid port '${port}' at position ${index + 1}. Must be between 1 and 65535`,
          path: [index],
        });
      }
    }
  });
});

export const proxySchema = z.union([socksProxySchema, proxyChainSchema], {
  message: "Invalid proxy configuration. Either a SOCKS proxy or a chain of HTTP/HTTPS/QUIC proxies is required",
});

export const logSchema = z
  .string()
  .optional()
  .superRefine((value, ctx) => {
    if (!value || value.trim() === "") return;

    const result = validateLogPath(value);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error!,
        path: [],
      });
    }
  })
  .describe("Saves log to this file. Will be created automatically if it doesn't exist.");

const BaseConfigSchema = z.object({
  listen: listenUriSchema,
  proxy: proxySchema,
  log: logSchema,
});

const OptionalConfigSchema = z.object({
  insecureConcurrency: positiveInteger
    .optional()
    .describe("Use N concurrent tunnel connections. Try N=2 first, strongly recommend against using more than 4."),
  extraHeaders: z
    .string()
    .optional()
    .describe("Appends extra headers in requests to the proxy server. Multiple headers are separated by CRLF."),
  hostResolverRules: z.string().optional().describe("Statically resolves a domain name to an IP address."),
  resolverRange: z.string().optional().describe("Uses this range in the builtin resolver. Default: 100.64.0.0/10."),
  logNetLog: z.string().optional().describe("Saves NetLog. View at https://netlog-viewer.appspot.com/."),
  sslKeyLogFile: z.string().optional().describe("Saves SSL keys for Wireshark inspection."),
  noPostQuantum: z.boolean().optional().describe("Overrides the default and disables post-quantum key agreement."),
});

export const NaiveProxyConfigJsonSchema = BaseConfigSchema;
export const NaiveProxyConfigSchema = BaseConfigSchema.merge(OptionalConfigSchema);

export const ConfigFileSchema = z
  .array(nonEmptyString)
  .optional()
  .superRefine((value, ctx) => {
    if (!value?.length) return;

    const result = validateConfigJson(value[0]);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error!,
        path: [0],
      });
    }
  });

export const NaiveExecutableSchema = z
  .array(nonEmptyString)
  .min(1, "NaiveProxy path is required")
  .max(1)
  .superRefine((value, ctx) => {
    const execPath = value[0];
    if (!fs.existsSync(execPath) || !fs.lstatSync(execPath).isFile() || !isExecutable(execPath)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid NaiveProxy executable",
        path: [0],
      });
    }
  });

const ExtensionPathSchema = z.object({
  naiveProxyPath: NaiveExecutableSchema,
  configFilePath: ConfigFileSchema,
});

export const ExtensionConfigSchema = ExtensionPathSchema.merge(NaiveProxyConfigSchema.partial()).superRefine(
  (data, ctx) => {
    const hasConfigFile = data.configFilePath && data.configFilePath.length == 1;
    const hasListen = !!data.listen?.trim();
    const hasProxy = !!data.proxy?.trim();

    if (hasConfigFile) {
      // Validate config file content
      const validationResult = validateConfigJson(data.configFilePath![0]);
      if (!validationResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationResult.error!,
          path: ["configFilePath"],
        });
      }
      // Direct config fields are optional when config file is present
      return;
    }

    if (!hasListen && !hasProxy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both listen and proxy are required when no config file is provided",
        path: ["configFilePath"],
      });
      return;
    }

    if (!hasListen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listen is required when no config file is provided",
        path: ["listen"],
      });
    }

    if (!hasProxy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Proxy is required when no config file is provided",
        path: ["proxy"],
      });
    }
  },
);

const validateLogPath = (logPath: string): { success: boolean; error?: string } => {
  try {
    // Check if it's an absolute path
    if (!path.isAbsolute(logPath)) {
      return {
        success: false,
        error: "Log path must be absolute",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Invalid log file path",
    };
  }
};

const validateConfigJson = (
  configPath: string,
): {
  success: boolean;
  error?: string;
} => {
  try {
    if (!fs.existsSync(configPath) || !fs.lstatSync(configPath).isFile()) {
      return {
        success: false,
        error: "Config file does not exist",
      };
    }

    // Read and parse file content
    const configContent = fs.readFileSync(configPath, "utf8");
    console.debug("Config content:", configContent);
    const result = NaiveProxyConfigJsonSchema.safeParse(JSON.parse(configContent));

    if (!result.success) {
      return {
        success: false,
        error: "Invalid config file content",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Failed to read or parse config file",
    };
  }
};
