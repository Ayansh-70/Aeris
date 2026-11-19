/** Public failures carry only text that can safely be returned to the browser. */
export class PublicError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function errorResponse(error: unknown) {
  const known = error instanceof PublicError;
  const status = known ? error.status : 503;
  return Response.json({ error: known ? error.message : "Service temporarily unavailable. Please retry." }, {
    status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
}

async function boundedJson(body: Request | Response, max: number) {
  if (Number(body.headers.get("content-length")) > max) throw new PublicError(413, "Request is too large.");
  const reader = body.body?.getReader();
  if (!reader) throw new PublicError(400, "A JSON body is required.");
  const decoder = new TextDecoder();
  let size = 0, value = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new PublicError(413, "Request is too large.");
      }
      value += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(value + decoder.decode()) as unknown;
  } finally { reader.releaseLock(); }
}

export async function readRequest(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new PublicError(415, "Send an application/json body.");
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new PublicError(403, "Origin is not permitted.");
  try { return await boundedJson(request, 16_384); }
  catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError(400, "Invalid JSON body.");
  }
}

export async function providerJson(url: URL, init?: RequestInit, timeout = 6500, max = 65_536): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new PublicError(response.status === 429 ? 429 : 503,
    response.status === 429 ? "Provider rate limit reached. Retry in a minute." : "The provider is currently unavailable.");
  try { return await boundedJson(response, max); }
  catch { throw new PublicError(503, "The provider returned an unreadable response."); }
}

/** Bounds memory and coalesces concurrent misses. Failures never poison the cache. */
export function memoized<T>(ttl: number, load: (key: string) => Promise<T>) {
  const cache = new Map<string, { pending: Promise<T>, until: number }>();
  return (key: string) => {
    const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return hit.pending;
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    const pending = load(key).catch((error: unknown) => {
      if (cache.get(key)?.pending === pending) cache.delete(key);
      throw error;
    });
    cache.set(key, { pending, until: Date.now() + ttl });
    return pending;
  };
}

// A shared per-process bucket bounds paid usage even with spoofed IP headers.
// A multi-instance deployment should also enforce a shared limit at the gateway.
const budgets = new Map<string, { used: number; until: number }>();
export function checkBudget(name: string, maxPerMinute: number) {
  let bucket = budgets.get(name);
  if (!bucket || bucket.until <= Date.now()) {
    bucket = { used: 0, until: Date.now() + 60_000 };
    budgets.set(name, bucket);
  }
  if (bucket.used >= maxPerMinute) throw new PublicError(429, "Request limit reached. Try again in a minute.");
  bucket.used++;
}

