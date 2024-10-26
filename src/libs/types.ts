// https://github.com/klzgrad/naiveproxy/blob/master/USAGE.txt
export interface NaiveProxyConfig {
  listen: string;
  proxy: string;
  log?: string;
  insecureConcurrency?: number;
  extraHeaders?: string;
  hostResolverRules?: string;
  resolverRange?: string;
  logNetLog?: string;
  sslKeyLogFile?: string;
  noPostQuantum?: boolean;
}

export interface ExtensionConfig extends Partial<NaiveProxyConfig> {
  naiveProxyPath: string[];
  configFilePath?: string[];
}

export interface ProxyState {
  isRunning: boolean;
  config: ExtensionConfig | null;
  isLoading: boolean;
}
