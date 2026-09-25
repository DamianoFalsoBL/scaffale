import { z } from 'zod';

import type { Source } from './types';

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly source: Source,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ProviderError';
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchJsonOptions<T> {
  source: Source;
  schema: z.ZodType<T>;
  /** Next.js data cache lifetime in seconds. */
  revalidate: number;
  headers?: HeadersInit;
  retries?: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

const MAX_RETRY_AFTER_MS = 5_000;
const BASE_DELAY_MS = 500;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

/** Retry-After as seconds or HTTP date, capped; undefined when absent or invalid. */
export function parseRetryAfter(header: string | null, now = Date.now()): number | undefined {
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now;

  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, MAX_RETRY_AFTER_MS) : undefined;
}

export function backoffDelay(attempt: number, random = Math.random) {
  return BASE_DELAY_MS * 2 ** attempt + Math.floor(random() * 250);
}

/**
 * GET a JSON resource with a timeout, retries with exponential backoff on 429/5xx and
 * network errors, and Zod validation of the body.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions<T>): Promise<T> {
  const {
    source,
    schema,
    revalidate,
    headers,
    retries = 2,
    timeoutMs = 8_000,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options;

  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < retries;
    let response: Response;

    try {
      response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        next: { revalidate },
      });
    } catch (error) {
      if (canRetry) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw new ProviderError(`${source} request failed`, source, undefined, { cause: error });
    }

    if (!response.ok) {
      if (canRetry && isRetryableStatus(response.status)) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        await sleep(retryAfter ?? backoffDelay(attempt));
        continue;
      }
      throw new ProviderError(`${source} responded ${response.status}`, source, response.status);
    }

    const parsed = schema.safeParse(await response.json());

    if (!parsed.success) {
      throw new ProviderError(
        `${source} returned an unexpected response`,
        source,
        response.status,
        {
          cause: parsed.error,
        },
      );
    }

    return parsed.data;
  }
}

/** Keeps the items that match the schema, so one malformed result doesn't sink a whole page. */
export function parseItems<T>(items: readonly unknown[], schema: z.ZodType<T>): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** "2021-09-15", "2021-09" or "2021" → 2021; empty or malformed → undefined. */
export function yearFromDate(date: string | null | undefined): number | undefined {
  const match = date?.match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

/** Empty strings from the APIs become undefined. */
export function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
