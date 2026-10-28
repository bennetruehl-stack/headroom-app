// WinAnsi-Codes für Zeichen außerhalb von ASCII, die in deutschen Texten vorkommen.
// Helvetica kennt sie mit /WinAnsiEncoding, ohne dass eine Schrift eingebettet werden muss.
const winAnsi: Record<string, number> = {
  'ä': 0xe4, 'ö': 0xf6, 'ü': 0xfc, 'Ä': 0xc4, 'Ö': 0xd6, 'Ü': 0xdc, 'ß': 0xdf, '€': 0x80,
  'é': 0xe9, 'è': 0xe8, 'à': 0xe0, '§': 0xa7, '–': 0x96, '—': 0x97, '„': 0x84, '“': 0x93, '”': 0x94,
  '‘': 0x91, '’': 0x92, '…': 0x85, '·': 0xb7, '×': 0xd7, '°': 0xb0,
};

/** Zeile als PDF-String: Klammern und Backslash escapen, Nicht-ASCII als Oktal-Escape (WinAnsi). */
function pdfString(row: string): string {
  let result = '';
  for (const char of row) {
    if (char === '\\' || char === '(' || char === ')') result += '\\' + char;
    else if (char >= ' ' && char <= '~') result += char;
    else if (winAnsi[char] !== undefined) result += '\\' + winAnsi[char].toString(8).padStart(3, '0');
    else result += '?';
  }
  return result;
}

export function makeTextPdf(text: string): string {
  // Zeichen ohne WinAnsi-Code (z. B. Emojis) werden zu Grundbuchstaben oder „?“.
  const normalized = [...text.replace(/\t/g, '  ')]
    .map((char) => (char === '\n' || (char >= ' ' && char <= '~') || winAnsi[char] !== undefined)
      ? char
      : char.normalize('NFKD').replace(/[\u0300-\u036f]/g, '') || '?')
    .join('');
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
    '3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj',
  ];
  pages.forEach((pageRows, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const textCommands = pageRows.map((row) =>
      '(' + pdfString(row) + ') Tj T*',
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
