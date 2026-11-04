import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = { requestId: string };

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Correlation id of the in-flight HTTP request (undefined outside a request). */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
