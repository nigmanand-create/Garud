export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | Date | null | undefined;
};

/**
 * Escapes one CSV cell (RFC 4180) and neutralises spreadsheet formula injection:
 * cells starting with = + - @ (or tab/CR) are prefixed with a single quote.
 */
export function csvCell(
  raw: string | number | boolean | Date | null | undefined,
): string {
  if (raw === null || raw === undefined) return '';
  let value =
    raw instanceof Date
      ? raw.toISOString()
      : typeof raw === 'string'
        ? raw
        : String(raw);
  if (typeof raw === 'string' && /^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  }
  // UTF-8 BOM so Excel opens non-ASCII names correctly.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
