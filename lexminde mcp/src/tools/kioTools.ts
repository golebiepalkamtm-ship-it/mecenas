import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchKioJudgments } from "../services/kioClient.js";

export function registerKioTools(server: McpServer): void {
  server.registerTool(
    "kio_search_judgments",
    {
      title: "Szukaj Wyroków KIO (Zamówienia Publiczne Pzp)",
      description: "Przeszukuje wyroki Krajowej Izby Odwoławczej (KIO) w sprawach odwołań od rozstrzygnięć przetargów, rażąco niskiej ceny, warunków udziału oraz SIWZ/SWZ.",
      inputSchema: z.object({
        query: z.string().optional().describe("Fraza słowna lub sygnatura (np. 'KIO 2201/23', 'rażąco niska cena', 'SWZ')")
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
        const items = await searchKioJudgments(query);

        const lines = [
          `# Wyroki Krajowej Izby Odwoławczej (KIO – Zamówienia Publiczne):`,
          ""
        ];

        for (const item of items) {
          lines.push(`## Wyrok KIO: ${item.sygnatura} (Data: ${item.dataWyroku})`);
          lines.push(`- **Zamawiający**: ${item.zamawiajacy}`);
          lines.push(`- **Odwołujący**: ${item.odwolujacy}`);
          lines.push(`- **Przedmiot zamówienia**: ${item.przedmiotZamowienia}`);
          lines.push(`- **Rozstrzygnięcie**: **${item.rozstrzygniecie}**`);
          lines.push(`- **Uzasadnienie**: ${item.uzasadnienie}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: items.length, items } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania wyroków KIO: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
