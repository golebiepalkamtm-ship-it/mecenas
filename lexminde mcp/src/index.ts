#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { logInfo, logError } from "./utils/logger.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  
  process.on("SIGINT", async () => {
    logInfo("Shutting down Lexminde MCP server...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logInfo("Shutting down Lexminde MCP server...");
    await server.close();
    process.exit(0);
  });

  logInfo(`Starting ${SERVER_NAME} v${SERVER_VERSION} via StdioServerTransport...`);
  await server.connect(transport);
}

main().catch((error) => {
  logError("Fatal error running Lexminde MCP server:", error);
  process.exit(1);
});
