import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  databaseUrl: string;
  cookieSecret: string;
  corsOrigin: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const portRaw = env.PORT ?? "3001";
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT configuration: "${portRaw}"`);
  }

  const nodeEnvRaw = env.NODE_ENV ?? "development";
  const nodeEnv =
    nodeEnvRaw === "production" || nodeEnvRaw === "test" ? nodeEnvRaw : "development";

  const databaseUrl =
    env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sonder_dev";
  const cookieSecret = env.COOKIE_SECRET ?? "dev-insecure-cookie-secret-min-32-chars!!";
  const corsOrigin = env.CORS_ORIGIN ?? "http://localhost:5173";

  return {
    port,
    nodeEnv,
    databaseUrl,
    cookieSecret,
    corsOrigin,
  };
}

/**
 * Sanitizes config for logging, redacting passwords and secrets.
 */
export function getRedactedConfig(config: ServerConfig): Record<string, unknown> {
  let redactedDb = "[REDACTED]";
  try {
    const parsed = new URL(config.databaseUrl);
    if (parsed.password) {
      parsed.password = "******";
    }
    redactedDb = parsed.toString();
  } catch {
    // If not a valid URL, redact completely
  }

  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    databaseUrl: redactedDb,
    cookieSecret: "******",
    corsOrigin: config.corsOrigin,
  };
}
