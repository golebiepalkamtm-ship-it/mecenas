import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getIsapPublishers, getIsapActsByYear, getIsapActDetails, getIsapActText } from "../services/isapClient.js";

export function registerIsapTools(server: McpServer): void {
  server.registerTool(
    "isap_list_publishers",
    {
      title: "Pobierz Wykaz Dzienników Urzędowych ISAP / Sejm ELI",
      description: "Zwraca listę dostępnych dzienników urzędowych (Dziennik Ustaw 'DU', Monitor Polski 'MP') z liczbą opublikowanych aktów prawnych i zakresem roczników od 1918 roku do chwili obecnej.",
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const publishers = await getIsapPublishers();

        const formatted = publishers.map(p => {
          const firstYear = p.years[0];
          const lastYear = p.years[p.years.length - 1];
          return `### ${p.name} (${p.shortName} / kod: '${p.code}')\n- **Całkowita liczba aktów**: ${p.actsCount}\n- **Zakres roczników**: ${firstYear} - ${lastYear}\n`;
        }).join("\n");

        return {
          content: [
            {
              type: "text",
              text: `# Dzienniki Urzędowe Rzeczypospolitej Polskiej (ISAP / ELI API)\n\n${formatted}`
            }
          ],
          structuredContent: { publishers } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania dzienników: ${error.message || String(error)}` }]
        };
      }
    }
  );

  server.registerTool(
    "isap_search_acts",
    {
      title: "Przeszukaj Akty Prawne w ISAP / ELI",
      description: "Przeszukuje akty prawne w Dzienniku Ustaw (DU) lub Monitorze Polskim (MP) dla podanego rocznika z możliwością filtrowania po tytule, typie dokumentu ('Ustawa', 'Rozporządzenie') lub statusie ('obowiązujący').",
      inputSchema: z.object({
        publisher: z.enum(["DU", "MP"]).default("DU").describe("Dziennik: 'DU' (Dziennik Ustaw) lub 'MP' (Monitor Polski)"),
        year: z.number().int().min(1918).max(2030).describe("Rok wydania aktu (np. 1997, 2024)"),
        query: z.string().optional().describe("Słowo kluczowe lub fraza do znalezienia w tytule aktu (np. 'Kodeks', 'podatek', 'rehabilitacja')"),
        type: z.string().optional().describe("Typ dokumentu (np. 'Ustawa', 'Rozporządzenie', 'Obwieszczenie', 'Uchwała')"),
        status: z.string().optional().describe("Status aktu (np. 'obowiązujący', 'uchylony', 'wygasł')"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maksymalna liczba zwracanych wyników (domyślnie 20)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ publisher, year, query, type, status, limit }) => {
      try {
        const response = await getIsapActsByYear(publisher, year);
        let items = response.items || [];

        if (query) {
          const qLower = query.toLowerCase();
          items = items.filter(item => item.title && item.title.toLowerCase().includes(qLower));
        }

        if (type) {
          const tLower = type.toLowerCase();
          items = items.filter(item => item.type && item.type.toLowerCase().includes(tLower));
        }

        if (status) {
          const sLower = status.toLowerCase();
          items = items.filter(item => item.status && item.status.toLowerCase().includes(sLower));
        }

        const totalFiltered = items.length;
        const sliced = items.slice(0, limit);

        if (sliced.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Nie odnaleziono aktów prawnych w ${publisher}/${year} spełniających podane kryteria.`
              }
            ],
            structuredContent: { count: 0, items: [] } as Record<string, unknown>
          };
        }

        const lines = [
          `# Akty Prawne w ISAP / ELI (${publisher} ${year})`,
          `Znaleziono pasujących: ${totalFiltered} (pokazano ${sliced.length}):`,
          ""
        ];

        for (const act of sliced) {
          lines.push(`## ${act.displayAddress} | ${act.type || "Akt"}`);
          lines.push(`- **Tytuł**: ${act.title}`);
          lines.push(`- **Pozycja**: ${act.pos}`);
          lines.push(`- **Status**: ${act.status || "Nieokreślony"}`);
          lines.push(`- **Data ogłoszenia**: ${act.announcementDate || act.promulgation || "Brak"}`);
          lines.push(`- **Identyfikator ELI**: \`${act.ELI}\` | Użyj \`isap_get_act_details(publisher="${publisher}", year=${year}, pos=${act.pos})\``);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { totalFiltered, items: sliced } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd podczas wyszukiwania aktów ISAP: ${error.message || String(error)}` }]
        };
      }
    }
  );

  server.registerTool(
    "isap_get_act_details",
    {
      title: "Pobierz Szczegóły Aktu Prawnego ISAP",
      description: "Pobiera szczegółowe metadane konkretnego aktu prawnego na podstawie wydawnictwa ('DU' lub 'MP'), roku oraz pozycji (np. publisher='DU', year=1997, pos=553 dla Kodeksu karnego). Zwraca status, datę wejścia w życie, podstawię prawną i akty powiązane.",
      inputSchema: z.object({
        publisher: z.enum(["DU", "MP"]).default("DU").describe("Dziennik urzędowy: 'DU' lub 'MP'"),
        year: z.number().int().min(1918).max(2030).describe("Rok wydania aktu (np. 1997, 2024)"),
        pos: z.number().int().positive().describe("Numer pozycji w Dzienniku Ustaw / Monitorze Polskim (np. 553)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ publisher, year, pos }) => {
      try {
        const details = await getIsapActDetails(publisher, year, pos);

        const lines = [
          `# Szczegóły Aktu Prawnego: ${details.displayAddress}`,
          `**Tytuł**: ${details.title}`,
          `**Typ dokumentu**: ${details.type || "Akt"}`,
          `**Status**: ${details.status || details.inForce || "Brak danych"}`,
          `**Data ogłoszenia**: ${details.announcementDate || "Brak"}`,
          `**Wejście w życie**: ${details.entryIntoForce || "Brak danych"}`,
          `**Wydane przez**: ${details.releasedBy?.join(", ") || "Brak danych"}`,
          ""
        ];

        if (details.keywords?.length) {
          lines.push(`**Słowa kluczowe**: ${details.keywords.join(", ")}`, "");
        }

        if (details.references) {
          lines.push("### Powiązane akty prawne:");
          for (const [refName, refList] of Object.entries(details.references)) {
            lines.push(`- **${refName}**: ${refList.map(r => r.id + (r.art ? ` (${r.art})` : "")).slice(0, 10).join(", ")}`);
          }
          lines.push("");
        }

        lines.push(`Aby pobrać pełny tekst HTML, wywołaj: \`isap_get_act_text(publisher="${publisher}", year=${year}, pos=${pos})\``);

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: details as unknown as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania aktu ${publisher}/${year} poz. ${pos}: ${error.message || String(error)}` }]
        };
      }
    }
  );

  server.registerTool(
    "isap_get_act_text",
    {
      title: "Pobierz Treść Aktu Prawnego ISAP",
      description: "Pobiera treść aktu prawnego w formacie tekstowym/HTML z portalu ISAP / Sejm ELI.",
      inputSchema: z.object({
        publisher: z.enum(["DU", "MP"]).default("DU").describe("Dziennik urzędowy: 'DU' lub 'MP'"),
        year: z.number().int().min(1918).max(2030).describe("Rok wydania aktu (np. 1997, 2024)"),
        pos: z.number().int().positive().describe("Numer pozycji (np. 553)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ publisher, year, pos }) => {
      try {
        const rawHtml = await getIsapActText(publisher, year, pos);

        const textClean = rawHtml
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<h[1-6][^>]*>/gi, "\n## ")
          .replace(/<\/h[1-6]>/gi, "\n")
          .replace(/<p[^>]*>/gi, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\n\s*\n/g, "\n\n")
          .trim();

        const truncatedText = textClean.length > 20000 
          ? textClean.slice(0, 20000) + "\n\n[... Treść aktu skrócona ze względu na limit ...] " 
          : textClean;

        return {
          content: [
            {
              type: "text",
              text: `# Treść Aktu Prawnego (${publisher} ${year} poz. ${pos})\n\n${truncatedText}`
            }
          ]
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania treści aktu ${publisher}/${year} poz. ${pos}: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
