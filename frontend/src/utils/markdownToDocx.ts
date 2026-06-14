import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.+)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;
const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index), font: "Times New Roman", size: 24 }));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      );
    } else {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          font: "Times New Roman",
          size: 24,
        }),
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), font: "Times New Roman", size: 24 }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: "Times New Roman", size: 24 })];
}

export function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const stripped = line.trim();

    if (!stripped) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
      continue;
    }

    if (HR_RE.test(stripped)) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }));
      continue;
    }

    const heading = stripped.match(HEADING_RE);
    if (heading) {
      const level = Math.min(heading[1].length, 6) - 1;
      const text = heading[2].trim();
      paragraphs.push(
        new Paragraph({
          heading: HEADING_LEVELS[level],
          alignment: level === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [
            new TextRun({
              text,
              bold: true,
              font: "Times New Roman",
              size: level === 0 ? 28 : 26,
            }),
          ],
          spacing: { before: level === 0 ? 0 : 240, after: 200 },
        }),
      );
      continue;
    }

    const blockquote = stripped.match(BLOCKQUOTE_RE);
    if (blockquote) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 720 },
          children: parseInlineRuns(blockquote[1]),
          spacing: { after: 120 },
        }),
      );
      continue;
    }

    const listMatch = line.match(LIST_RE);
    if (listMatch) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInlineRuns(listMatch[3].trim()),
          spacing: { after: 80 },
        }),
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: parseInlineRuns(stripped),
        spacing: { after: 120, line: 276 },
      }),
    );
  }

  return paragraphs;
}

export async function buildDocxBlob(markdown: string, title?: string): Promise<Blob> {
  const children = markdownToDocxParagraphs(markdown);

  const doc = new Document({
    title: title ?? "Pismo prawne",
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadMarkdownAsDocx(
  filenameBase: string,
  markdown: string,
): Promise<void> {
  const safeName = filenameBase.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/gi, "").trim() || "pismo";
  const blob = await buildDocxBlob(markdown, safeName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}_${new Date().toISOString().split("T")[0]}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
