import { describe, expect, test } from "vitest";
import { proxySchema, listenUriSchema } from "../src/types";

describe("listenUriSchema", () => {
  test.each([
    // Valid cases
    ["socks://", true],
    ["http://", true],
    ["redir://", true],
    ["socks://127.0.0.1", true],
    ["http://localhost", true],
    ["redir://example.com", true],
    ["socks://127.0.0.1:1080", true],
    ["http://localhost:8080", true],
    ["redir://example.com:9090", true],
    ["socks://user:pass@127.0.0.1", true],
    ["http://user:pass@localhost:8080", true],
    ["redir://user:pass@example.com:9090", true],
    ["socks://0.0.0.0:65535", true],
    ["http://127.0.0.1:1", true],
    ["redir://user:pass@", true], // Valid, address will default to 0.0.0.0, port defaults to 1080
    ["socks://user:pass@:1080", true], // Valid, address will default to 0.0.0.0

    // Invalid cases
    ["ftp://example.com", false],
    ["socks5://example.com", false],
    ["socks://example.com:0", false],
    ["http://example.com:65536", false],
    ["redir://example.com:port", false],
    ["socks://user@example.com", false], // Missing password
    ["http://:pass@example.com", false], // Missing username
    ["socks://127.0.0.1:1080:extra", false], // Too many colons
  ])("listenUriSchema validates %s as %s", (url, expected) => {
    const result = listenUriSchema.safeParse(url);
    expect(result.success).toBe(expected);
    if (!result.success && expected) {
      console.error(`Unexpected failure for ${url}:`, result.error);
    }
  });
});

describe("proxySchema", () => {
  test.each([
    // SOCKS proxies
    ["socks://example.com", true],
    ["socks://example.com:1080", true],
    ["socks://127.0.0.1", true],
    ["socks://127.0.0.1:8888", true],
    ["socks://", false],
    ["socks://example.com:65536", false],
    ["socks://example.com:0", false],
    ["socks://user:pass@example.com:1080", false],
    ["socks5://example.com:1080", false],

    // HTTP/HTTPS/QUIC proxies
    ["http://example.com", true],
    ["https://user:pass@example.com:8080", true],
    ["quic://example.com", true],
    ["http://127.0.0.1:8080", true],
    ["https://proxy.example.com:443", true],

    // Proxy chains
    ["http://proxy1.com,https://proxy2.com", true],
    ["http://proxy1.com,quic://proxy2.com,https://proxy3.com", true],
    ["https://proxy1.com:443,quic://proxy2.com:700", true],
    ["http://user:pass@proxy1.com,https://proxy2.com:8080", true],

    // Invalid configurations
    ["ftp://example.com", false],
    ["socks://proxy1.com,http://proxy2.com", false],
    ["http://proxy1.com,socks://proxy2.com", false],
    ["http://example.com:65536", false],
    ["http://example.com:0", false],
    ["http://,https://proxy2.com", false],
    ["http://proxy1.com,,https://proxy3.com", false],
  ])("proxySchema validates %s as %s", (proxy, expected) => {
    const result = proxySchema.safeParse(proxy);
    expect(result.success).toBe(expected);
    if (!result.success && expected) {
      console.error(`Unexpected failure for ${proxy}:`, result.error);
    }
  });
});
