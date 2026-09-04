/**
 * Small fetch helper for the data scripts: explicit timeout, bounded retries
 * with exponential backoff, and a descriptive User-Agent.
 */

export class HttpError extends Error {
  status: number
  url: string

  constructor(url: string, status: number, statusText: string) {
    super(`HTTP ${status} ${statusText} for ${url}`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

export interface FetchJsonOptions {
  /** HTTP method; defaults to GET, or POST when `form` is given. */
  method?: 'GET' | 'POST'
  /** URL-encoded form fields sent as the request body. */
  form?: Record<string, string | number>
  /** Abort a single attempt after this many milliseconds. */
  timeoutMs?: number
  /** Total number of attempts (not retries after the first). */
  attempts?: number
  /** Base delay before the second attempt; doubles each retry. */
  backoffMs?: number
  headers?: Record<string, string>
  /** Injected for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch
  /** Injected for tests; defaults to setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * Identifies the fetcher honestly while using the conventional
 * "Mozilla/5.0 (compatible; …)" form that sumo.or.jp requires for HTML pages.
 */
export const USER_AGENT =
  'Mozilla/5.0 (compatible; banzuke-app/1.0; +https://github.com/jonath0n/banzuke-app)'

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * Fetches a URL and parses it as JSON. Retries on network errors, timeouts,
 * 429 and 5xx responses; gives up immediately on other 4xx responses.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  })
  return (await response.json()) as T
}

/** Fetches a URL and returns the body as text, with the same retry policy. */
export async function fetchText(url: string, options: FetchJsonOptions = {}): Promise<string> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: { Accept: 'text/html,application/xhtml+xml', ...options.headers },
  })
  return response.text()
}

async function fetchWithRetry(url: string, options: FetchJsonOptions): Promise<Response> {
  const {
    form,
    method = form ? 'POST' : 'GET',
    timeoutMs = 15_000,
    attempts = 3,
    backoffMs = 1_000,
    headers = {},
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options

  let body: string | undefined
  if (form) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(form)) params.set(key, String(value))
    body = params.toString()
  }

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url, {
        method,
        headers: {
          'User-Agent': USER_AGENT,
          'X-Requested-With': 'XMLHttpRequest',
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...headers,
        },
        body,
        // A redirect means we are being bounced to a different page (for
        // example a bot check); treat it as a failure rather than parsing
        // whatever the redirect target returns.
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        const error = new HttpError(url, response.status, response.statusText)
        if (!isRetryable(response.status)) throw error
        lastError = error
      } else {
        return response
      }
    } catch (error) {
      if (error instanceof HttpError && !isRetryable(error.status)) throw error
      lastError = error
    }

    if (attempt < attempts) {
      await sleep(backoffMs * 2 ** (attempt - 1))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`)
}
