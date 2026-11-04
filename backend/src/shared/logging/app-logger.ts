import type { LogLevel, LoggerService } from '@nestjs/common';
import { getRequestId } from './request-context';

const ORDER: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

export type LogFormat = 'json' | 'pretty';

export function resolveLogFormat(
  env: NodeJS.ProcessEnv = process.env,
): LogFormat {
  const explicit = env.LOG_FORMAT?.toLowerCase();
  if (explicit === 'json' || explicit === 'pretty') return explicit;
  return env.NODE_ENV === 'production' ? 'json' : 'pretty';
}

export function resolveLogLevels(
  env: NodeJS.ProcessEnv = process.env,
): LogLevel[] {
  const wanted = (env.LOG_LEVEL?.toLowerCase() ??
    (env.NODE_ENV === 'production' ? 'log' : 'debug')) as LogLevel;
  const idx = ORDER.indexOf(wanted);
  return ORDER.slice(0, idx === -1 ? ORDER.indexOf('log') + 1 : idx + 1);
}

type Write = (line: string) => void;

/**
 * Nest `LoggerService` that stamps every line with the request correlation id.
 * - `json` (production default): one JSON object per line → pm2/journald/log shippers.
 * - `pretty` (dev default): `time LEVEL [Context] message (rid)`.
 */
export class AppLogger implements LoggerService {
  private readonly levels: LogLevel[];

  constructor(
    private readonly format: LogFormat = resolveLogFormat(),
    levels: LogLevel[] = resolveLogLevels(),
    private readonly out: Write = (l) => process.stdout.write(`${l}\n`),
    private readonly err: Write = (l) => process.stderr.write(`${l}\n`),
  ) {
    this.levels = levels;
  }

  log(message: unknown, ...optional: unknown[]) {
    this.write('log', message, optional);
  }
  error(message: unknown, ...optional: unknown[]) {
    this.write('error', message, optional);
  }
  warn(message: unknown, ...optional: unknown[]) {
    this.write('warn', message, optional);
  }
  debug(message: unknown, ...optional: unknown[]) {
    this.write('debug', message, optional);
  }
  verbose(message: unknown, ...optional: unknown[]) {
    this.write('verbose', message, optional);
  }
  fatal(message: unknown, ...optional: unknown[]) {
    this.write('fatal', message, optional);
  }

  private write(level: LogLevel, message: unknown, optional: unknown[]) {
    if (!this.levels.includes(level)) return;

    // Nest passes the context as the last string argument; `error` may pass a stack before it.
    const params = [...optional];
    let context: string | undefined;
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }
    const stack =
      level === 'error' || level === 'fatal'
        ? params.find((p): p is string => typeof p === 'string')
        : undefined;

    const requestId = getRequestId();
    const text =
      message instanceof Error
        ? message.message
        : typeof message === 'string'
          ? message
          : safeStringify(message);
    const errStack = message instanceof Error ? message.stack : stack;
    const sink = level === 'error' || level === 'fatal' ? this.err : this.out;

    if (this.format === 'json') {
      sink(
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          context,
          requestId,
          message: text,
          ...(errStack ? { stack: errStack } : {}),
        }),
      );
      return;
    }

    const rid = requestId ? ` (${requestId.slice(0, 8)})` : '';
    sink(
      `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${context ?? 'App'}] ${text}${rid}${
        errStack ? `\n${errStack}` : ''
      }`,
    );
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
