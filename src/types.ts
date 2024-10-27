// https://github.com/klzgrad/naiveproxy/blob/master/USAGE.txt

import { z } from "zod";

const nonEmptyString = z.string().min(1, "Cannot be empty");
const positiveInteger = z.number().int().positive();

export const listenUriSchema = z
  .string()
  .regex(/^(socks|http|redir):\/\/(([^:@]+:[^@]+@)?([^:@]+)?(:\d{1,5})?)?$/)
  .refine(
    (val) => {
      const [proto, rest] = val.split("://");
      if (!["socks", "http", "redir"].includes(proto)) return false;

      if (!rest) return true; // Only protocol is specified, which is valid

      const parts = rest.split("@");
      const hostPart = parts.length > 1 ? parts[1] : parts[0];
      const [, port] = hostPart.split(":");

      if (port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
      }

      return true; // Valid format
    },
    {
      message:
        "Invalid listen URI. Format should be: <LISTEN-PROTO>://[<USER>:<PASS>@][<ADDR>][:<PORT>] where <LISTEN-PROTO> is 'socks', 'http', or 'redir', and PORT (if present) is between 1 and 65535",
    },
  )
  .describe("Listens at addr:port with protocol <LISTEN-PROTO>. Default proto, addr, port: socks, 0.0.0.0, 1080.");

// SOCKS-PROXY schema
const socksProxySchema = z
  .string()
  .regex(/^socks:\/\/[^:]+?(:\d{1,5})?$/)
  .refine(
    (val) => {
      const parts = val.split(":");
      if (parts.length === 2) return true; // No port specified
      if (parts.length === 3) {
        const port = parseInt(parts[2]);
        return port >= 1 && port <= 65535;
      }
      return false; // Invalid format
    },
    { message: "Invalid SOCKS proxy. Format should be: socks://<HOSTNAME>[:<PORT>] with port between 1 and 65535" },
  );

// PROXY-CHAIN schema
const proxyChainSchema = z
  .string()
  .regex(
    /^(http|https|quic):\/\/(([^:@]+:[^@]+@)?[^:@]+?(:\d{1,5})?)(,(http|https|quic):\/\/(([^:@]+:[^@]+@)?[^:@]+?(:\d{1,5})?)){0,}$/,
  )
  .refine(
    (val) => {
      return val.split(",").every((uri) => {
        if (uri === "") return false; // Reject empty URIs (handles consecutive commas)
        const [proto, rest] = uri.split("://");
        if (!["http", "https", "quic"].includes(proto)) return false;
        if (!rest) return false; // Reject if there's nothing after ://

        const parts = rest.split("@");
        const hostPart = parts.length > 1 ? parts[1] : parts[0];
        const [host, port] = hostPart.split(":");

        if (!host) return false; // Host is required

        if (port) {
          const portNum = parseInt(port);
          return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
        }

        return true; // Valid format
      });
    },
    {
      message:
        "Invalid proxy chain. Format should be: <PROXY-URI>[,<PROXY-URI>...] where each PROXY-URI is <PROXY-PROTO>://[<USER>:<PASS>@]<HOSTNAME>[:<PORT>] with optional port between 1 and 65535",
    },
  );

export const proxySchema = z.union([socksProxySchema, proxyChainSchema], {
  message: "Invalid proxy configuration. Either a SOCKS proxy or a chain of HTTP/HTTPS/QUIC proxies is required",
});

export const logSchema = z.union([
  z.string().endsWith(".log"),
  z.string().optional(),
  // z.string().max(0), // This allows an empty string
  // z.undefined(), // This allows the field to be omitted
]);

export const NaiveProxyConfigJsonSchema = z.object({
  listen: listenUriSchema.describe("Listens at addr:port with protocol <LISTEN-PROTO>."),
  proxy: proxySchema.describe("Routes traffic via the proxy chain."),
  log: logSchema.describe("Saves log to file. If omitted, logs to console."),
});

export type NaiveProxyConfigJson = z.infer<typeof NaiveProxyConfigJsonSchema>;

// Schema for NaiveProxyConfig
export const NaiveProxyConfigSchema = NaiveProxyConfigJsonSchema.extend({
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
// Schema for ExtensionConfig
export const ExtensionConfigSchema = NaiveProxyConfigSchema.extend({
  naiveProxyPath: z.array(nonEmptyString).nonempty(),
  configFilePath: z.array(nonEmptyString).optional(),
  // TODO
  proxiedApps: z.array(nonEmptyString).optional(),
});

export type NaiveProxyConfig = z.infer<typeof NaiveProxyConfigSchema>;

export interface ExtensionConfig extends Partial<NaiveProxyConfig> {
  naiveProxyPath: string[];
  configFilePath?: string[];
  // proxiedApps?: string[];
}

export interface ProxyState {
  isRunning: boolean;
  config: ExtensionConfig | null;
  isLoading: boolean;
}
