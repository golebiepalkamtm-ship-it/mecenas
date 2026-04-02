
/**
 * Utility for exporting documents to PDF via the browser's print functionality.
 * This approach ensures the best formatting without external libraries.
 */
export const exportToPDF = () => {
  // We'll let the component render it in a hidden way via print container.
  window.print();
};

export const downloadAsMarkdown = (title: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
