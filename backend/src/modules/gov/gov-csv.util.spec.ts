import {
  mapCsvRow,
  normalizeHeader,
  parseCsvText,
  parseTruthyPublish,
} from './gov-csv.util';

describe('gov-csv.util', () => {
  it('parses quoted commas', () => {
    const { headers, rows } = parseCsvText(
      'title,summary\n"Hello, world",Plain summary here',
    );
    expect(headers).toEqual(['title', 'summary']);
    expect(rows[0]).toEqual(['Hello, world', 'Plain summary here']);
  });

  it('normalizes header aliases', () => {
    expect(normalizeHeader('officialUrl')).toBe('sourceUrl');
    expect(normalizeHeader('closing_at')).toBe('closingDate');
    expect(normalizeHeader('issuing body')).toBe('issuingBody');
  });

  it('maps row cells to canonical keys', () => {
    const mapped = mapCsvRow(
      ['type', 'officialUrl', 'details'],
      ['TENDER', 'https://gem.gov.in/', 'Long text'],
    );
    expect(mapped).toEqual({
      type: 'TENDER',
      sourceUrl: 'https://gem.gov.in/',
      description: 'Long text',
    });
  });

  it('parses publish flag', () => {
    expect(parseTruthyPublish('true')).toBe(true);
    expect(parseTruthyPublish('0')).toBe(false);
    expect(parseTruthyPublish(undefined)).toBe(false);
  });
});
