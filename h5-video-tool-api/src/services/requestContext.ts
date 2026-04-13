import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = {
  account?: string;
};

const store = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return store.run(ctx, fn);
}

export function getRequestAccount(): string | undefined {
  const account = store.getStore()?.account?.trim();
  return account ? account : undefined;
}

