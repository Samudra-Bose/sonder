import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { closeDbPool } from "../src/db/pool.js";

describe("Health Probes (/health/live and /health/ready)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const config = loadConfig({
      PORT: "0", // Ephemeral port
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/sonder_test_nonexistent",
    });
    server = createApp(config);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDbPool();
  });

  it("GET /health/live returns 200 { status: 'UP' } with Cache-Control: no-store", async () => {
    const res = await fetch(`${baseUrl}/health/live`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Type")).toBe("application/json");

    const data = await res.json();
    expect(data).toEqual({ status: "UP" });
  });

  it("GET /health/ready returns 503 Problem Details with Retry-After when PostgreSQL is unavailable", async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const body = await res.json();
    expect(body.status).toBe(503);
    expect(body.title).toBe("Service Unavailable");
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
    // Invariant: never leak internal query or connection credentials in readiness response
    expect(body.detail).toBe("Service readiness dependencies are currently unavailable.");
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("postgres");
    expect(JSON.stringify(body)).not.toContain("SELECT 1");
  });
});
