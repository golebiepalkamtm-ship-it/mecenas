import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchUodoDecisions } from "../services/uodoClient.js";

export function registerUodoTools(server: McpServer): void {
  server.registerTool(
    "uodo_search_decisions",
    {
      title: "Przeszukaj Decyzje i Kary UODO (RODO)",
      description: "Baza decyzji administracyjnych oraz KAZUSÓW nakładania kar finansowych przez Prezesa Urzędu Ochrony Danych Osobowych (UODO) za naruszenie RODO.",
      inputSchema: z.object({
        query: z.string().optional().describe("Fraza słowna lub artykuł RODO (np. 'wyciek danych', 'art. 33 RODO', 'brak szyfrowania')")
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
        const decisions = await searchUodoDecisions(query);

        const lines = [
          `# Decyzje i Kary Finansowe UODO (RODO):`,
          ""
        ];

        for (const dec of decisions) {
          lines.push(`## Decyzja: ${dec.sygnatura} (Data: ${dec.dataDecyzji})`);
          lines.push(`- **Ukarany podmiot**: ${dec.podmiot}`);
          lines.push(`- **Nałożona kara finansowa**: **${dec.karaFinansowa || "Brak kary pieniężnej (Upomnienie)"}**`);
          lines.push(`- **Powołane artykuły RODO**: ${dec.powolanePrzepisy.join(", ")}`);
          lines.push(`- **Opis stanu faktycznego**: ${dec.opis}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: decisions.length, decisions } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania decyzji UODO: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
