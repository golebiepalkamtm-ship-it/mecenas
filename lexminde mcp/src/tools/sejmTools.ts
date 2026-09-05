import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
  getSejmPrints, 
  getSejmPrintDetails, 
  getSejmMPs, 
  getSejmInterpellations, 
  getSejmCommittees,
  getSejmVotings,
  getSejmVotingDetails
} from "../services/sejmClient.js";

export function registerSejmTools(server: McpServer): void {
  // Tool 1: List / Search Prints (Druki sejmowe)
  server.registerTool(
    "sejm_list_prints",
    {
      title: "Przeszukaj Druki Sejmowe i Projekty Ustaw",
      description: "Przeszukuje druki sejmowe i projekty ustaw w Sejmie RP dla wybranej kadencji (domyślnie kadencja 10). Pozwala filtrować po słowach w tytule aktu.",
      inputSchema: z.object({
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji Sejmu (np. 10 dla bieżącej kadencji)"),
        query: z.string().optional().describe("Słowo kluczowe lub fraza do znalezienia w tytule druku sejmowego (np. 'podatek', 'budżet', 'kodeks')"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maksymalna liczba zwracanych wyników (domyślnie 20)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ term, query, limit }) => {
      try {
        const prints = await getSejmPrints(term);
        let filtered = prints;

        if (query) {
          const qLower = query.toLowerCase();
          filtered = filtered.filter(p => p.title && p.title.toLowerCase().includes(qLower));
        }

        const totalFiltered = filtered.length;
        const sliced = filtered.slice(0, limit);

        if (sliced.length === 0) {
          return {
            content: [{ type: "text", text: `Nie odnaleziono druków sejmowych w ${term}. kadencji spełniających podane kryteria.` }],
            structuredContent: { totalFiltered: 0, prints: [] } as Record<string, unknown>
          };
        }

        const lines = [
          `# Druki Sejmowe – Kadencja ${term} (Dopasowano: ${totalFiltered}, pokazano: ${sliced.length})`,
          ""
        ];

        for (const print of sliced) {
          lines.push(`## Druk nr ${print.number}`);
          lines.push(`- **Tytuł**: ${print.title}`);
          lines.push(`- **Data dokumentu**: ${print.documentDate || print.deliveryDate || "Brak"}`);
          if (print.attachments?.length) {
            lines.push(`- **Załączniki (PDF)**: ${print.attachments.join(", ")}`);
          }
          lines.push(`- **Użyj**: \`sejm_get_print_details(number="${print.number}", term=${term})\``);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { totalFiltered, prints: sliced } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania druków sejmowych: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 2: Get Print Details
  server.registerTool(
    "sejm_get_print_details",
    {
      title: "Pobierz Szczegóły Druku Sejmowego",
      description: "Pobiera szczegółowe metadane i załączniki konkretnego druku sejmowego po jego numerze (np. number='1' lub '100').",
      inputSchema: z.object({
        number: z.string().describe("Numer druku sejmowego (np. '1', '100')"),
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji Sejmu (domyślnie 10)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ number, term }) => {
      try {
        const details = await getSejmPrintDetails(number, term);

        const lines = [
          `# Szczegóły Druku Sejmowego nr ${details.number} (Kadencja ${term})`,
          `**Tytuł**: ${details.title}`,
          `**Data dokumentu**: ${details.documentDate || "Brak"}`,
          `**Data dostarczenia**: ${details.deliveryDate || "Brak"}`,
          `**Data ostatniej zmiany**: ${details.changeDate || "Brak"}`,
          ""
        ];

        if (details.attachments?.length) {
          lines.push("### Załączniki PDF:");
          for (const att of details.attachments) {
            lines.push(`- https://api.sejm.gov.pl/sejm/term${term}/prints/${details.number}/${att}`);
          }
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: details as unknown as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania druku nr ${number}: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 3: Search MPs (Posłowie)
  server.registerTool(
    "sejm_search_mps",
    {
      title: "Szukaj Posłów na Sejm RP",
      description: "Przeszukuje i listuje posłów na Sejm RP z możliwością filtrowania po nazwisku, klubie parlamentarnym (np. 'PiS', 'KO', 'Polska2050', 'PSL', 'Lewica', 'Konfederacja') lub okręgu wyborczym.",
      inputSchema: z.object({
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji Sejmu (domyślnie 10)"),
        name: z.string().optional().describe("Imię lub nazwisko posła (np. 'Adamczyk', 'Tusk')"),
        club: z.string().optional().describe("Kod klubu parlamentarnego (np. 'PiS', 'KO', 'Polska2050', 'PSL', 'Lewica', 'Konfederacja')"),
        district: z.string().optional().describe("Nazwa okręgu wyborczego (np. 'Kraków', 'Warszawa')"),
        limit: z.number().int().min(1).max(100).default(20).describe("Liczba wyników do wyświetlenia")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ term, name, club, district, limit }) => {
      try {
        const mps = await getSejmMPs(term);
        let filtered = mps;

        if (name) {
          const nLower = name.toLowerCase();
          filtered = filtered.filter(m => m.firstLastName && m.firstLastName.toLowerCase().includes(nLower));
        }

        if (club) {
          const cLower = club.toLowerCase();
          filtered = filtered.filter(m => m.club && m.club.toLowerCase() === cLower);
        }

        if (district) {
          const dLower = district.toLowerCase();
          filtered = filtered.filter(m => m.districtName && m.districtName.toLowerCase().includes(dLower));
        }

        const totalFiltered = filtered.length;
        const sliced = filtered.slice(0, limit);

        if (sliced.length === 0) {
          return {
            content: [{ type: "text", text: `Nie odnaleziono posłów spełniających kryteria.` }],
            structuredContent: { count: 0, mps: [] } as Record<string, unknown>
          };
        }

        const lines = [
          `# Wykaz Posłów na Sejm RP – Kadencja ${term} (Znaleziono: ${totalFiltered}, pokazano: ${sliced.length})`,
          ""
        ];

        for (const mp of sliced) {
          lines.push(`## ${mp.firstLastName} (${mp.club})`);
          lines.push(`- **Okręg wyborczy**: nr ${mp.districtNum} ${mp.districtName} (${mp.voivodeship || ""})`);
          lines.push(`- **Liczba głosów**: ${mp.numberOfVotes || "Brak danych"}`);
          lines.push(`- **Wykształcenie / zawód**: ${mp.educationLevel || ""} / ${mp.profession || ""}`);
          lines.push(`- **E-mail**: ${mp.email || "Brak"}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { totalFiltered, mps: sliced } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania posłów: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 4: Interpellations
  server.registerTool(
    "sejm_list_interpellations",
    {
      title: "Przeszukaj Interpelacje Poselskie",
      description: "Pobiera listę interpelacji poselskich i zapytań złożonych w Sejmie RP z możliwością filtrowania po słowie kluczowym w tytule.",
      inputSchema: z.object({
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji (domyślnie 10)"),
        query: z.string().optional().describe("Fraza do znalezienia w tytule interpelacji"),
        limit: z.number().int().min(1).max(100).default(20).describe("Liczba wyników")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ term, query, limit }) => {
      try {
        const interps = await getSejmInterpellations(term);
        let filtered = interps;

        if (query) {
          const qLower = query.toLowerCase();
          filtered = filtered.filter(i => i.title && i.title.toLowerCase().includes(qLower));
        }

        const totalFiltered = filtered.length;
        const sliced = filtered.slice(0, limit);

        if (sliced.length === 0) {
          return {
            content: [{ type: "text", text: "Nie odnaleziono interpelacji spełniających podane kryteria." }],
            structuredContent: { count: 0, interpellations: [] } as Record<string, unknown>
          };
        }

        const lines = [
          `# Interpelacje Poselskie – Kadencja ${term} (Znaleziono: ${totalFiltered}, pokazano: ${sliced.length})`,
          ""
        ];

        for (const interp of sliced) {
          lines.push(`## Interpelacja nr ${interp.num}`);
          lines.push(`- **Tytuł**: ${interp.title}`);
          lines.push(`- **Data wpływu**: ${interp.receiptDate || "Brak"}`);
          if (interp.from?.length) lines.push(`- **Od (posłowie)**: ${interp.from.join(", ")}`);
          if (interp.to?.length) lines.push(`- **Do (adresat)**: ${interp.to.join(", ")}`);
          lines.push("");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { totalFiltered, interpellations: sliced } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania interpelacji: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 5: Committees
  server.registerTool(
    "sejm_list_committees",
    {
      title: "Pobierz Lista Komisji Sejmowych",
      description: "Zwraca wykaz komisji sejmowych w Sejmie RP dla podanej kadencji.",
      inputSchema: z.object({
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji (domyślnie 10)")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ term }) => {
      try {
        const committees = await getSejmCommittees(term);

        const lines = [
          `# Wykaz Komisji Sejmowych – Kadencja ${term} (Łącznie: ${committees.length})`,
          ""
        ];

        for (const com of committees) {
          lines.push(`- **[Kod: ${com.code}]** ${com.name}${com.type ? ` (${com.type})` : ""}`);
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: committees.length, committees } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania komisji: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 6: List Votings (Posiedzenia i Głosowania)
  server.registerTool(
    "sejm_list_votings",
    {
      title: "Lista Posiedzeń i Dni Głosowań w Sejmie",
      description: "Pobiera listę dni posiedzeń Sejmu RP z podaną liczbą przeprowadzonych głosowań w danej kadencji.",
      inputSchema: z.object({
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji Sejmu (domyślnie 10)"),
        proceeding: z.number().int().positive().optional().describe("Filtruj po numerze posiedzenia (np. 1, 2, 3)"),
        limit: z.number().int().min(1).max(50).default(15).describe("Liczba zwracanych pozycji")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ term, proceeding, limit }) => {
      try {
        const list = await getSejmVotings(term);
        let filtered = list;

        if (proceeding) {
          filtered = filtered.filter(v => v.proceeding === proceeding);
        }

        const sliced = filtered.slice(0, limit);

        const lines = [
          `# Głosowania w Sejmie RP – Kadencja ${term} (Pokazano ${sliced.length} dni posiedzeń):`,
          ""
        ];

        for (const item of sliced) {
          lines.push(`- **Data**: ${item.date} | **Posiedzenie nr**: ${item.proceeding} | **Liczba głosowań**: ${item.votingsNum}`);
          lines.push(`  - Wywołanie: \`sejm_get_voting_details(sitting=${item.proceeding}, votingNumber=1, term=${term})\``);
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { count: sliced.length, votings: sliced } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania listy głosowań: ${error.message || String(error)}` }]
        };
      }
    }
  );

  // Tool 7: Get Voting Details & Votes
  server.registerTool(
    "sejm_get_voting_details",
    {
      title: "Pobierz Wyniki i Głosy Posłów w Głosowaniu",
      description: "Pobiera szczegółowy wynik konkretnego głosowania w Sejmie po numerze posiedzenia (sitting) i numerze głosowania (votingNumber), wraz z indywidualnymi głosami posłów (np. ZA, PRZECIW, WSTRZYMAŁ SIĘ).",
      inputSchema: z.object({
        sitting: z.number().int().positive().describe("Numer posiedzenia Sejmu (np. 1)"),
        votingNumber: z.number().int().positive().describe("Numer głosowania na posiedzeniu (np. 1)"),
        term: z.number().int().min(1).max(10).default(10).describe("Numer kadencji Sejmu (domyślnie 10)"),
        mp_name: z.string().optional().describe("Filtruj głos konkretnego posła po nazwisku"),
        club: z.string().optional().describe("Filtruj głosy posłów z danego klubu parlamentarnego (np. 'PiS', 'KO')")
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ sitting, votingNumber, term, mp_name, club }) => {
      try {
        const details = await getSejmVotingDetails(sitting, votingNumber, term);

        const lines = [
          `# Wyniki Głosowania: ${details.title || details.topic}`,
          `**Posiedzenie nr**: ${details.sitting} | **Głosowanie nr**: ${votingNumber} | **Data**: ${details.date}`,
          `**Opis**: ${details.description || details.topic || "Brak opisu"}`,
          `**Głosowało łącznie**: ${details.totalVoted}`,
          ""
        ];

        let votes = details.votes || [];

        if (mp_name) {
          const nameLower = mp_name.toLowerCase();
          votes = votes.filter(v => `${v.firstName} ${v.lastName}`.toLowerCase().includes(nameLower));
        }

        if (club) {
          const clubLower = club.toLowerCase();
          filteredVotes: votes = votes.filter(v => v.club && v.club.toLowerCase() === clubLower);
        }

        if (votes.length) {
          lines.push(`### Wybrane głosy posłów (Pokazano: ${Math.min(votes.length, 30)} z ${votes.length}):`);
          for (const v of votes.slice(0, 30)) {
            const voteText = v.vote === "YES" ? "ZA" : v.vote === "NO" ? "PRZECIW" : v.vote === "ABSTAIN" ? "WSTRZYMAŁ SIĘ" : v.vote;
            lines.push(`- **${v.firstName} ${v.lastName}** (${v.club}): **${voteText}**`);
          }
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: {
            title: details.title,
            sitting: details.sitting,
            date: details.date,
            totalVoted: details.totalVoted,
            filteredVotesCount: votes.length,
            votes: votes.slice(0, 50)
          } as Record<string, unknown>
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Błąd pobierania głosowania ${sitting}/${votingNumber}: ${error.message || String(error)}` }]
        };
      }
    }
  );
}
