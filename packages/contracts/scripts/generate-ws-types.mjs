import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import { compile } from "json-schema-to-typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const contractsDocsDir = path.resolve(rootDir, "Community-Work-Management-v1.5/docs/contracts");
const outDir = path.resolve(__dirname, "../src");

async function generate() {
  console.log("Generating WebSocket types from canonical schemas...");

  // 1. ws-events
  const wsEventsPath = path.resolve(contractsDocsDir, "ws-events.schema.json");
  const openapiPath = path.resolve(contractsDocsDir, "openapi.yaml");

  const wsEventsRaw = JSON.parse(fs.readFileSync(wsEventsPath, "utf8"));
  const openapiRaw = yaml.parse(fs.readFileSync(openapiPath, "utf8"));

  // Provide components mapping in-memory so schemas like NotificationCategory resolve
  wsEventsRaw.components = openapiRaw.components;

  const wsEventsTs = await compile(wsEventsRaw, "WorkManagementRealtimeEvents", {
    unknownAny: true,
    bannerComment: "/* eslint-disable */\n/** Generated from ws-events.schema.json - DO NOT EDIT MANUALLY */\n"
  });

  fs.writeFileSync(path.resolve(outDir, "ws-events-types.ts"), wsEventsTs, "utf8");
  console.log("✓ Generated src/ws-events-types.ts");

  // 2. ws-protocol
  const wsProtocolPath = path.resolve(contractsDocsDir, "ws-protocol.schema.json");
  const wsProtocolRaw = JSON.parse(fs.readFileSync(wsProtocolPath, "utf8"));

  const wsProtocolTs = await compile(wsProtocolRaw, "WorkManagementRealtimeControlProtocol", {
    unknownAny: true,
    bannerComment: "/* eslint-disable */\n/** Generated from ws-protocol.schema.json - DO NOT EDIT MANUALLY */\n"
  });

  fs.writeFileSync(path.resolve(outDir, "ws-protocol-types.ts"), wsProtocolTs, "utf8");
  console.log("✓ Generated src/ws-protocol-types.ts");
}

generate().catch((err) => {
  console.error("Failed to generate WebSocket types:", err);
  process.exit(1);
});
