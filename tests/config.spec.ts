import { describe, it, expect } from "vitest";
import { proxySchema, NaiveProxyConfigSchema, listenUriSchema } from "../src/types";

// import {readConfigFile} from "../src/utils";
// import path from 'path';

describe("listenUriSchema", () => {
  it("should validate a listen URL", () => {
    expect(listenUriSchema.parse("socks://127.0.0.1:1080")).toBe("socks://127.0.0.1:1080");
    expect(listenUriSchema.parse("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(listenUriSchema.parse("redir://127.0.0.1:8080")).toBe("redir://127.0.0.1:8080");
  });

  it("should reject invalid listen URLs", () => {
    expect(() => listenUriSchema.parse("http://123")).toThrow();
    expect(() => listenUriSchema.parse("socks://32324")).toThrow();
    expect(() => listenUriSchema.parse("redir://21213@22")).toThrow();
  });
});

describe("proxySchema", () => {
  it("should validate a single SOCKS proxy", () => {
    expect(proxySchema.parse("socks://example.com")).toBe("socks://example.com");
    expect(proxySchema.parse("socks://example.com:1080")).toBe("socks://example.com:1080");
  });

  it("should validate a single HTTP/HTTPS/QUIC proxy", () => {
    expect(proxySchema.parse(["http://example.com"])).toEqual(["http://example.com"]);
    expect(proxySchema.parse(["https://user:pass@example.com:8080"])).toEqual(["https://user:pass@example.com:8080"]);
    expect(proxySchema.parse(["quic://example.com"])).toEqual(["quic://example.com"]);
  });

  it("should validate a chain of HTTP/HTTPS/QUIC proxies", () => {
    expect(proxySchema.parse(["http://proxy1.com", "https://proxy2.com"])).toEqual([
      "http://proxy1.com",
      "https://proxy2.com",
    ]);
    expect(proxySchema.parse(["http://proxy1.com", "quic://proxy2.com", "https://proxy3.com"])).toEqual([
      "http://proxy1.com",
      "quic://proxy2.com",
      "https://proxy3.com",
    ]);
  });

  it("should reject invalid proxy configurations", () => {
    expect(() => proxySchema.parse("http://example.com")).toThrow();
    expect(() => proxySchema.parse(["socks://example.com"])).toThrow();
    expect(() => proxySchema.parse(["http://proxy1.com", "socks://proxy2.com"])).toThrow();
  });
});

describe("NaiveProxyConfigSchema", () => {
  it("should validate a complete configuration", () => {
    const config = {
      listen: "socks://127.0.0.1:1080",
      proxy: ["https://example.com"],
      log: "naive.log",
      insecureConcurrency: 2,
    };
    expect(NaiveProxyConfigSchema.parse(config)).toEqual(config);
  });

  it("should validate a configuration with SOCKS proxy", () => {
    const config = {
      listen: "http://127.0.0.1:8080",
      proxy: "socks://proxy.example.com:1080",
    };
    expect(NaiveProxyConfigSchema.parse(config)).toEqual(config);
  });

  it("should reject a configuration without required fields", () => {
    expect(() => NaiveProxyConfigSchema.parse({})).toThrow();
    expect(() => NaiveProxyConfigSchema.parse({ listen: "socks://127.0.0.1:1080" })).toThrow();
    expect(() => NaiveProxyConfigSchema.parse({ proxy: ["https://example.com"] })).toThrow();
  });

  it("should accept a configuration with both listen and proxy", () => {
    const config = {
      listen: "socks://127.0.0.1:1080",
      proxy: ["https://example.com"],
    };
    expect(NaiveProxyConfigSchema.parse(config)).toEqual(config);
  });
});

// describe("Test config.json file", () => {
//   it("should read and validate a config.json file", async () => {
//     const config = await readConfigFile([path.join(__dirname, "config.json")]);
//     expect(config).not.toBeNull()
//     expect(config?.listen).toEqual(["socks://127.0.0.1:1080"]);
//     expect(config?.proxy).toEqual(["https://user:pass@example.com"]);
//   })
// })
