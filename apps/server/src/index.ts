import { loadConfig, getRedactedConfig } from "./config.js";
import { createApp } from "./app.js";
import { closeDbPool } from "./db/pool.js";

const config = loadConfig();
const server = createApp(config);

server.listen(config.port, () => {
  console.log(`[Sonder Server] Started on port ${config.port}`);
  console.log("[Sonder Server] Environment:", JSON.stringify(getRedactedConfig(config), null, 2));
});

// Graceful Shutdown
let isShuttingDown = false;

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Sonder Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error("[Sonder Server] Error closing HTTP server:", err);
    } else {
      console.log("[Sonder Server] HTTP server closed.");
    }

    try {
      await closeDbPool();
      console.log("[Sonder Server] Database pool closed.");
    } catch (dbErr) {
      console.error("[Sonder Server] Error closing database pool:", dbErr);
    }

    process.exit(0);
  });

  // Force exit after 10s if graceful close stalls
  setTimeout(() => {
    console.error("[Sonder Server] Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
