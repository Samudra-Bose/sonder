import { describe, it, expect } from "vitest";
import { loadConfig, getRedactedConfig } from "../src/config.js";

describe("Server Config & Environment Validation", () => {
  it("loads default configuration when env is empty", () => {
    const config = loadConfig({});
    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe("development");
    expect(config.databaseUrl).toContain("postgresql://");
    expect(config.corsOrigin).toBe("http://localhost:5173");
  });

  it("parses valid custom environment variables", () => {
    const config = loadConfig({
      PORT: "8080",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://usr:secret123@dbhost:5432/sonder_prod",
      COOKIE_SECRET: "my-secure-production-cookie-secret-key-123",
      CORS_ORIGIN: "https://app.sonder.com",
    });

    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe("production");
    expect(config.databaseUrl).toBe("postgresql://usr:secret123@dbhost:5432/sonder_prod");
    expect(config.cookieSecret).toBe("my-secure-production-cookie-secret-key-123");
    expect(config.corsOrigin).toBe("https://app.sonder.com");
  });

  it("throws an error when PORT is invalid", () => {
    expect(() => loadConfig({ PORT: "not-a-number" })).toThrow(/Invalid PORT configuration/);
    expect(() => loadConfig({ PORT: "-1" })).toThrow(/Invalid PORT configuration/);
    expect(() => loadConfig({ PORT: "99999" })).toThrow(/Invalid PORT configuration/);
  });

  it("redacts database password and cookie secret in logs", () => {
    const config = loadConfig({
      DATABASE_URL: "postgresql://usr:superSecretPassword@dbhost:5432/sonder_prod",
      COOKIE_SECRET: "confidential-key",
    });

    const redacted = getRedactedConfig(config);
    expect(redacted.cookieSecret).toBe("******");
    expect(String(redacted.databaseUrl)).not.toContain("superSecretPassword");
    expect(String(redacted.databaseUrl)).toContain("******");
  });
});
