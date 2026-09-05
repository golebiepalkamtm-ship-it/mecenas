import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExampleTools } from "./example.js";
import { registerSaosTools } from "./saosTools.js";
import { registerIsapTools } from "./isapTools.js";
import { registerSejmTools } from "./sejmTools.js";
import { registerKrsTools } from "./krsTools.js";
import { registerCbosaTools } from "./cbosaTools.js";
import { registerUodoTools } from "./uodoTools.js";
import { registerKioTools } from "./kioTools.js";
import { registerTsueTools } from "./tsueTools.js";

export function registerAllTools(server: McpServer): void {
  registerExampleTools(server);
  registerSaosTools(server);
  registerIsapTools(server);
  registerSejmTools(server);
  registerKrsTools(server);
  registerCbosaTools(server);
  registerUodoTools(server);
  registerKioTools(server);
  registerTsueTools(server);
}
