import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchCbosaJudgments } from "../services/cbosaClient.js";

export function registerCbosaTools(server: McpServer): void {
  server.registerTool(
    "cbosa_search_judgments",
    {
      title: "Szukaj Orzeczeń Sądów Administracyjnych (CBOSA - NSA / WSA)",
      description: "Przeszukuje wyroki i postanowienia Naczelnego Sądu Administracyjnego (NSA) oraz Wojewódzkich Sądów Administracyjnych (WSA) m.in. w sprawach podatkowych (VAT, PIT, CIT), budowlanych i nieruchomości.",
      inputSchema: z.object({
        query: z.string().optional().describe("Fraza słowna lub sygnatura akt (np. 'I FSK 101/23', 'VAT odliczenie')"),
        symbol: z.string().optional().describe("Symbol sprawy (np. '6110' dla VAT, '6113' dla CIT)"),
        limit: z.number().int().min(1).max(20).default(10).describe("Liczba zwracanych wyroków")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ query, symbol, limit }) => {
      try {
        const items = await searchCbosaJudgments({ query, symbol, limit });

        if (items.length === 0) {
          return {
            content: [{ type: "text", text: "Nie odnaleziono orzeczeń sądów administracyjnych spełniających kryteria." }]
          };
        }

        const lines = [
          `# Wyniki z bazy CBOSA (Naczelny Sąd Administracyjny & WSA):`,
          ""
        ];

        for (const item of items) {
          lines.push(`## Wyrok: ${item.sygnatura} (${item.sad})`);
          lines.push(`- **Data orzeczenia**: ${item.dataOrzeczenia}`);
          lines.push(`- **Dziedzina/Symbol**: ${item.symbolPrawa || "Brak"}`);
          lines.push(`- **Sentencja**: ${item.sentencja || "Brak"}`);
          lines.push(`- **Fragment uzasadnienia**: ${item.uzasadnienie?.slice(0, 300)}...`);
          lines.push(`- **Link**: ${item.url}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: items.length, items } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania orzeczeń CBOSA: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
