
export function makeTextPdf(text: string): string {
  const normalized = text
    .replace(/€/g, ' EUR')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '?');
  const rows = normalized.split('\n').flatMap((paragraph) => {
    if (!paragraph) return [''];
    const wrapped: string[] = [];
    let remaining = paragraph;
    while (remaining.length > 88) {
      let breakAt = remaining.lastIndexOf(' ', 88);
      if (breakAt < 1) breakAt = 88;
      wrapped.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    wrapped.push(remaining);
    return wrapped;
  });
  const pages: string[][] = [];
  for (let index = 0; index < rows.length; index += 52) pages.push(rows.slice(index, index + 52));
  if (!pages.length) pages.push([]);

  const pageIds = pages.map((_, index) => 4 + index * 2);
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >> endobj',
    '3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  pages.forEach((pageRows, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const textCommands = pageRows.map((row) =>
      '(' + row.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ') Tj T*',
    ).join('\n');
    const stream = 'BT /F1 10 Tf 48 790 Td 14 TL\n' + textCommands + '\nET';
    objects.push(
      pageId + ' 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + contentId + ' 0 R >> endobj',
      contentId + ' 0 obj << /Length ' + stream.length + ' >> stream\n' + stream + '\nendstream endobj',
    );
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object + '\n';
  }
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer << /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return pdf;
}
