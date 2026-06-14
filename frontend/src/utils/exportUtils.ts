import { downloadMarkdownAsDocx } from "./markdownToDocx";
import { API_BASE } from "../config";

/**
 * Utility for exporting documents to PDF via the browser's print functionality.
 */
export const exportToPDF = () => {
  window.print();
};

export const downloadAsMarkdown = (title: string, content: string) => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type StructuredExportData = {
  sender?: string;
  recipient?: string;
  placeDate?: string;
  attachments?: string;
};

/** Pobierz treść Markdown jako dokument Word (.docx) przez backend (docxtpl), z fallbackiem lokalnym. */
export const downloadAsDocx = async (
  title: string,
  content: string,
  structuredData?: StructuredExportData,
) => {
  try {
    const response = await fetch(`${API_BASE}/documents/export-docx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: title,
        document_text: content,
        structured_data: structuredData ?? null,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  } catch {
    await downloadMarkdownAsDocx(title, content);
  }
};
