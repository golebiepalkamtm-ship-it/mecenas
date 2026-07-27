import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKrsCompanyDetails, searchCeidgBusiness } from "../services/krsClient.js";

export function registerKrsTools(server: McpServer): void {
  // Tool 1: Get KRS Company Details
  server.registerTool(
    "krs_get_company",
    {
      title: "Pobierz Odpis Spółki z KRS",
      description: "Pobiera aktualny odpis spółki handlowej z Krajowego Rejestru Sądowego (KRS API Ministerstwa Sprawiedliwości). Zwraca skład zarządu, sposób reprezentacji, kapitał zakładowy oraz siedzibę.",
      inputSchema: z.object({
        krs: z.string().describe("Numer KRS spółki (np. '0000012345' lub '12345')")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ krs }) => {
      try {
        const details = await getKrsCompanyDetails(krs);

        const lines = [
          `# Odpis KRS – ${details.nazwa}`,
          `**KRS**: ${details.krs}`,
          `**Forma prawna**: ${details.formaPrawna || "Nieokreślona"}`,
          `**Siedziba**: ${details.siedziba?.miejscowosc || "Brak"}, ${details.siedziba?.kraj || "Polska"}`,
          `**Kapitał zakładowy**: ${details.kapitalZakladowy || "Brak danych"}`,
          "",
          "### Sposób reprezentacji:",
          `> ${details.reprezentacja?.sposobReprezentacji || "Brak wpisu"}`,
          "",
          "### Skład organu reprezentacji (Zarząd / Prokuranci):"
        ];

        if (details.reprezentacja?.sklad?.length) {
          for (const member of details.reprezentacja.sklad) {
            lines.push(`- **${member.imiona || ""} ${member.nazwisko || ""}** – ${member.funkcja || "Członek organu"}`);
          }
        } else {
          lines.push("- Brak wykazanych osób w reprezentacji.");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: details as unknown as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania danych KRS: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 2: Search CEIDG Business
  server.registerTool(
    "ceidg_search_business",
    {
      title: "Szukaj Jednoosobowej Działalności (CEIDG)",
      description: "Przeszukuje rejestr CEIDG (Centralna Ewidencja i Informacja o Działalności Gospodarczej) w celu weryfikacji jednoosobowych przedsiębiorców po numerze NIP lub REGON.",
      inputSchema: z.object({
        query: z.string().describe("Numer NIP (10 cyfr) lub REGON przedsiębiorcy")
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
        const data = await searchCeidgBusiness(query);

        return {
          content: [{ type: "text", text: `# Wyniki weryfikacji CEIDG dla ${query}:\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` }],
          structuredContent: data as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd wyszukiwania CEIDG: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
