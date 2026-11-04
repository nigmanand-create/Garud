import { AppLogger, resolveLogFormat, resolveLogLevels } from './app-logger';
import { resolveRequestId } from './request-id.middleware';
import { runWithRequestContext } from './request-context';

describe('AppLogger', () => {
  it('emits one JSON line with requestId inside a request context', () => {
    const out: string[] = [];
    const logger = new AppLogger(
      'json',
      ['log', 'warn', 'error', 'fatal'],
      (l) => out.push(l),
    );
    runWithRequestContext({ requestId: 'req-12345678' }, () =>
      logger.log('hello', 'Ctx'),
    );
    const line = JSON.parse(out[0]) as Record<string, unknown>;
    expect(line).toMatchObject({
      level: 'log',
      context: 'Ctx',
      requestId: 'req-12345678',
      message: 'hello',
    });
  });

  it('writes errors to the error sink with stack', () => {
    const err: string[] = [];
    const logger = new AppLogger(
      'json',
      ['error'],
      () => undefined,
      (l) => err.push(l),
    );
    logger.error('boom', 'at stack', 'Ctx');
    expect(JSON.parse(err[0])).toMatchObject({
      level: 'error',
      message: 'boom',
      stack: 'at stack',
      context: 'Ctx',
    });
  });

  it('pretty format is human readable and respects level filter', () => {
    const out: string[] = [];
    const logger = new AppLogger('pretty', ['log'], (l) => out.push(l));
    logger.debug('hidden', 'Ctx');
    logger.log('shown', 'Ctx');
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('[Ctx] shown');
  });

  it('defaults: json + log level in production, pretty + debug elsewhere', () => {
    expect(
      resolveLogFormat({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toBe('json');
    expect(
      resolveLogFormat({ NODE_ENV: 'development' } as NodeJS.ProcessEnv),
    ).toBe('pretty');
    expect(
      resolveLogFormat({
        NODE_ENV: 'production',
        LOG_FORMAT: 'pretty',
      } as NodeJS.ProcessEnv),
    ).toBe('pretty');
    expect(
      resolveLogLevels({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).not.toContain('debug');
    expect(
      resolveLogLevels({ LOG_LEVEL: 'warn' } as NodeJS.ProcessEnv),
    ).toEqual(['fatal', 'error', 'warn']);
  });
});

describe('resolveRequestId', () => {
  it('reuses a well-formed inbound id', () => {
    expect(resolveRequestId('abc-12345678')).toBe('abc-12345678');
  });
  it('replaces missing or unsafe ids', () => {
    expect(resolveRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId('bad id\nx')).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId('short')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
