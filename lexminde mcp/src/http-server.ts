import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerIsapTools } from "./tools/isapTools.js";
import { registerSaosTools } from "./tools/saosTools.js";
import { registerSejmTools } from "./tools/sejmTools.js";
import { logInfo } from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT || 3000;

function createServer(): McpServer {
  const server = new McpServer({
    name: "lexminde",
    version: "1.0.0"
  });

  registerIsapTools(server);
  registerSaosTools(server);
  registerSejmTools(server);

  return server;
}

const server = createServer();
let transport: SSEServerTransport | null = null;

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", name: "lexminde", version: "1.0.0", timestamp: new Date().toISOString() });
});

app.get("/sse", async (_req: Request, res: Response) => {
  logInfo("New SSE connection established");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

app.listen(PORT, () => {
  logInfo(`Lexminde HTTP MCP Server is running on port ${PORT}`);
  logInfo(`- Health Check: http://localhost:${PORT}/health`);
  logInfo(`- SSE Endpoint: http://localhost:${PORT}/sse`);
});
