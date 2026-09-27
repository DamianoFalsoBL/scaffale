import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  backoffDelay,
  fetchJson,
  forEachLimited,
  nonEmpty,
  parseItems,
  parseRetryAfter,
  ProviderError,
  yearFromDate,
  type FetchLike,
} from './http';

const schema = z.object({ ok: z.boolean() });

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function fetchSequence(...responses: (Response | Error)[]) {
  const fn = vi.fn<FetchLike>();
  for (const response of responses) {
    if (response instanceof Error) {
      fn.mockRejectedValueOnce(response);
    } else {
      fn.mockResolvedValueOnce(response);
    }
  }
  return fn;
}

const base = { source: 'tmdb', schema, revalidate: 60 } as const;

describe('fetchJson', () => {
  it('returns the validated body', async () => {
    const fetchImpl = fetchSequence(jsonResponse({ ok: true }));

    await expect(fetchJson('https://x.test', { ...base, fetchImpl })).resolves.toEqual({
      ok: true,
    });
  });

  it('retries 429 honoring Retry-After, then succeeds', async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = fetchSequence(
      new Response(null, { status: 429, headers: { 'retry-after': '2' } }),
      jsonResponse({ ok: true }),
    );

    await expect(fetchJson('https://x.test', { ...base, fetchImpl, sleep })).resolves.toEqual({
      ok: true,
    });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries 5xx and network errors with backoff', async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = fetchSequence(
      new Response(null, { status: 503 }),
      new TypeError('fetch failed'),
      jsonResponse({ ok: true }),
    );

    await expect(fetchJson('https://x.test', { ...base, fetchImpl, sleep })).resolves.toEqual({
      ok: true,
    });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retries with a ProviderError carrying the status', async () => {
    const fetchImpl = fetchSequence(
      new Response(null, { status: 429 }),
      new Response(null, { status: 429 }),
      new Response(null, { status: 429 }),
    );

    const error = await fetchJson('https://x.test', {
      ...base,
      fetchImpl,
      sleep: async () => {},
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry client errors', async () => {
    const fetchImpl = fetchSequence(new Response(null, { status: 401 }));

    await expect(fetchJson('https://x.test', { ...base, fetchImpl })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects bodies that do not match the schema', async () => {
    const fetchImpl = fetchSequence(jsonResponse({ ok: 'yes' }));

    await expect(fetchJson('https://x.test', { ...base, fetchImpl })).rejects.toThrow(
      'unexpected response',
    );
  });
});

describe('helpers', () => {
  it('parses Retry-After seconds and dates, capped at 5s', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');

    expect(parseRetryAfter('1', now)).toBe(1000);
    expect(parseRetryAfter('60', now)).toBe(5000);
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:03 GMT', now)).toBe(3000);
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter('soon', now)).toBeUndefined();
  });

  it('grows the backoff exponentially', () => {
    expect(backoffDelay(0, () => 0)).toBe(500);
    expect(backoffDelay(2, () => 0)).toBe(2000);
  });

  it('keeps only valid items', () => {
    expect(parseItems([{ ok: true }, { ok: 1 }, null], schema)).toEqual([{ ok: true }]);
  });

  it('extracts years and drops empty strings', () => {
    expect(yearFromDate('2021-09-15')).toBe(2021);
    expect(yearFromDate('1999')).toBe(1999);
    expect(yearFromDate('')).toBeUndefined();
    expect(yearFromDate(undefined)).toBeUndefined();
    expect(nonEmpty('  ')).toBeUndefined();
    expect(nonEmpty(' a ')).toBe('a');
  });
});

describe('forEachLimited', () => {
  it('runs every item with at most the given number in flight', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await forEachLimited([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      done.push(n);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it('does nothing without items', async () => {
    const task = vi.fn(async () => {});
    await forEachLimited([], 8, task);
    expect(task).not.toHaveBeenCalled();
  });
});
