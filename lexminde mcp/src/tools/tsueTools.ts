import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchTsueJudgments } from "../services/tsueClient.js";

export function registerTsueTools(server: McpServer): void {
  server.registerTool(
    "tsue_search_judgments",
    {
      title: "Szukaj Wyroków TSUE (Trybunał Sprawiedliwości UE)",
      description: "Przeszukuje przełomowe wyroki Trybunału Sprawiedliwości Unii Europejskiej (TSUE / CURIA) dotyczące prawa konsumenckiego, spraw frankowych, RODO i prawa konkurencji.",
      inputSchema: z.object({
        query: z.string().optional().describe("Fraza słowna lub sygnatura sprawy (np. 'C-520/21', 'kredyt frankowy', 'dyrektywa 93/13')")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ query }) => {
      try {
        const items = await searchTsueJudgments(query);

        const lines = [
          `# Wyroki Trybunału Sprawiedliwości Unii Europejskiej (TSUE):`,
          ""
        ];

        for (const item of items) {
          lines.push(`## Wyrok TSUE: ${item.sygnatura} (Data: ${item.dataWyroku})`);
          lines.push(`- **Tytuł sprawy**: ${item.sprawa}`);
          lines.push(`- **Teza wyroku**: ${item.tezaWyroku}`);
          lines.push(`- **CURIA Link**: ${item.url}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: items.length, items } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania wyroków TSUE: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
