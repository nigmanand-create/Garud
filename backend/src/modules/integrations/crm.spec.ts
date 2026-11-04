import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { csvCell, toCsv } from './csv.util';
import { CrmExportService } from './crm-export.service';
import { CrmWebhookService, signCrmPayload } from './crm-webhook.service';
import { validateEnv } from '../../config/env.validation';

function cfg(env: Record<string, string>) {
  return { get: (k: string) => env[k] } as unknown as ConfigService;
}

describe('csv util', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('l1\nl2')).toBe('"l1\nl2"');
    expect(csvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+91 98765')).toBe("'+91 98765");
    expect(csvCell(42)).toBe('42');
  });

  it('builds header + rows with BOM and CRLF', () => {
    const csv = toCsv(
      [{ a: 1, b: 'x' }],
      [
        { header: 'a', value: (r) => r.a },
        { header: 'b', value: (r) => r.b },
      ],
    );
    expect(csv).toBe('\uFEFFa,b\r\n1,x\r\n');
  });
});

describe('CrmWebhookService', () => {
  const env = {
    CRM_WEBHOOK_URL: 'https://crm.example.com/hook',
    CRM_WEBHOOK_SECRET: 'super-secret-value-123',
    CRM_WEBHOOK_RETRY_DELAY_MS: '0',
  };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('is disabled without url+secret and sends nothing', async () => {
    const svc = new CrmWebhookService(cfg({ CRM_WEBHOOK_URL: 'https://x.y' }));
    expect(svc.enabled).toBe(false);
    expect(await svc.deliver('enquiry.created', {})).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs body with HMAC-SHA256 over timestamp.body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);
    const svc = new CrmWebhookService(cfg(env));
    expect(await svc.deliver('enquiry.created', { id: 'e1' })).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe(env.CRM_WEBHOOK_URL);
    expect(headers['X-Garud-Event']).toBe('enquiry.created');
    const expected = `sha256=${createHmac('sha256', env.CRM_WEBHOOK_SECRET)
      .update(`${headers['X-Garud-Timestamp']}.${init.body as string}`)
      .digest('hex')}`;
    expect(headers['X-Garud-Signature']).toBe(expected);
    expect(JSON.parse(init.body as string)).toMatchObject({
      event: 'enquiry.created',
      data: { id: 'e1' },
    });
    expect(signCrmPayload('s', '1', 'b')).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('retries 5xx / network errors then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const svc = new CrmWebhookService(cfg(env));
    expect(await svc.deliver('enquiry.routed', {})).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable 4xx and never throws on emit', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 } as Response);
    const svc = new CrmWebhookService(cfg(env));
    expect(await svc.deliver('enquiry.created', {})).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(() => svc.emit('enquiry.created', {})).not.toThrow();
  });
});

describe('CRM env validation', () => {
  const base = {
    DATABASE_URL: 'postgresql://x',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
  };
  it('rejects url without secret', () => {
    expect(() =>
      validateEnv({ ...base, CRM_WEBHOOK_URL: 'https://crm.example.com' }),
    ).toThrow(/CRM_WEBHOOK_SECRET/);
  });
  it('accepts url + strong secret', () => {
    expect(() =>
      validateEnv({
        ...base,
        CRM_WEBHOOK_URL: 'https://crm.example.com',
        CRM_WEBHOOK_SECRET: 'x'.repeat(20),
      }),
    ).not.toThrow();
  });
});

describe('CrmExportService', () => {
  it('queries with filters and returns CSV rows', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'e1',
        createdAt: new Date('2026-11-01T00:00:00Z'),
        name: 'Rahul',
        email: 'r@x.in',
        phone: null,
        subject: '=cmd',
        message: 'hi, there',
        intent: 'DEMO',
        serviceKey: null,
        sourcePage: '/enquiry',
        status: 'NEW',
        routedAt: null,
        organization: { id: 'o1', companyName: 'Partner Co' },
        listing: null,
        lead: { id: 'l1', status: 'NEW' },
      },
    ]);
    const svc = new CrmExportService({ enquiry: { findMany } } as never);
    const { csv, rowCount } = await svc.exportEnquiriesCsv({
      routing: 'ROUTED',
      status: 'NEW' as never,
    });
    expect(rowCount).toBe(1);
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      status: 'NEW',
      organizationId: { not: null },
    });
    expect(csv).toContain('enquiry_id,created_at');
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('"hi, there"');
    expect(csv).toContain('Partner Co');
  });
});
