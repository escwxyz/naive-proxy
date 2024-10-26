import { z } from "zod";

export const listenSchema = z.string().startsWith("socks://"); // todo

export const proxySchema = z.union([
  z.string().startsWith("https://"),
  z.string().startsWith("quic://"),
  z.string().startsWith("http://"),
  z.string().startsWith("socks://"),
]);

export const logSchema = z.union([
  z.string().endsWith(".log"),
  z.string().max(0), // This allows an empty string
  z.undefined(), // This allows the field to be omitte
]);

export const ConfigFileSchema = z.object({
  listen: listenSchema,
  proxy: proxySchema,
  log: logSchema,
});

export const ConfigSchema = z.object({
  naiveProxyPath: z.array(z.string()).nonempty(),
  configFilePath: z.array(z.string()).optional(),
  proxy: z.string().optional(),
  listen: z.string().optional(),
  log: z.string().optional(),
  // TODO: add extraHeaders, hostResolverRules, resolverRange, logNetLog, sslKeyLogFile, noPostQuantum
});
