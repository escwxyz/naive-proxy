export interface NaiveProxyConfig {
    listen: string;
    proxy: string;
    log?: string;
}


export interface ExtensionConfig extends Partial<NaiveProxyConfig> {
    naiveProxyPath: string[];
    configFilePath?: string[];
}
