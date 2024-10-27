// https://github.com/klzgrad/naiveproxy/blob/master/USAGE.txt

import { z } from "zod";

const nonEmptyString = z.string().min(1, "Cannot be empty");
const positiveInteger = z.number().int().positive();

export const listenUriSchema = z.string().regex(/^(socks|http|redir):\/\/([^:@]+:[^@]+@)?[^:@]+?(:\d+)?$/, {
  message: "Invalid listen URL. Format should be: <LISTEN-PROTO>://<USER>:<PASS>@<ADDR>:<PORT>",
});

const proxyUriString = z.string().regex(/^(http|https|quic):\/\/([^:@]+:[^@]+@)?[^:@]+?(:\d+)?$/);

const socksProxyString = z.string().regex(/^socks:\/\/[^:@]+?(:\d+)?$/);

const proxyChainSchema = z.array(proxyUriString).min(1);

export const proxySchema = z.union([socksProxyString, proxyChainSchema]);

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
