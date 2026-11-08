/**
 * Minimal RFC 4180 CSV parser for admin tender import (no external deps).
 */

export type ParsedCsv = { headers: string[]; rows: string[][] };

export function parseCsvText(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && rows.length === 0) return;
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      pushField();
      i++;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ''));
  return { headers, rows: dataRows };
}

const HEADER_ALIASES: Record<string, string> = {
  type: 'type',
  title: 'title',
  summary: 'summary',
  issuingbody: 'issuingBody',
  issuing_body: 'issuingBody',
  'issuing body': 'issuingBody',
  referenceno: 'referenceNo',
  reference_no: 'referenceNo',
  reference: 'referenceNo',
  state: 'state',
  estimatedvalueinr: 'estimatedValueInr',
  estimated_value_inr: 'estimatedValueInr',
  estimatedvalue: 'estimatedValueInr',
  estimated_value: 'estimatedValueInr',
  closingat: 'closingDate',
  closing_at: 'closingDate',
  closingdate: 'closingDate',
  closing_date: 'closingDate',
  closing: 'closingDate',
  officialurl: 'sourceUrl',
  official_url: 'sourceUrl',
  sourceurl: 'sourceUrl',
  source_url: 'sourceUrl',
  eligibility: 'eligibility',
  details: 'description',
  description: 'description',
  publish: 'publish',
  opendate: 'openDate',
  open_date: 'openDate',
};

export function normalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  const snake = key.replace(/\s+/g, '_');
  if (HEADER_ALIASES[snake]) return HEADER_ALIASES[snake];
  const compact = key.replace(/[\s_]+/g, '');
  if (HEADER_ALIASES[compact]) return HEADER_ALIASES[compact];
  return raw.trim();
}

export function mapCsvRow(
  headers: string[],
  values: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    const v = values[idx]?.trim() ?? '';
    if (v !== '') out[norm] = v;
  });
  return out;
}

export function parseTruthyPublish(raw?: string): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return (
    v === 'true' || v === '1' || v === 'yes' || v === 'y' || v === 'published'
  );
}
