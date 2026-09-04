// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { HttpError, USER_AGENT, fetchJson, fetchText } from './http'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

const noSleep = () => Promise.resolve()

describe('fetchJson', () => {
  it('returns parsed JSON and sends identifying headers', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ Result: '1' }))
    const result = await fetchJson<{ Result: string }>('https://example.test/data', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(result).toEqual({ Result: '1' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['User-Agent']).toBe(USER_AGENT)
    expect(headers['X-Requested-With']).toBe('XMLHttpRequest')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('retries on 5xx and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const sleep = vi.fn(noSleep)
    const result = await fetchJson('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      backoffMs: 100,
    })
    expect(result).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(100)
  })

  it('retries on network errors with exponential backoff', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const sleep = vi.fn(noSleep)
    await fetchJson('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      backoffMs: 50,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([50, 100])
  })

  it('treats a redirect as a failure instead of following it', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://example.test/bot-check' } })
    )
    await expect(
      fetchText('https://example.test/page', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: noSleep,
      })
    ).rejects.toThrow(/HTTP 302/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.redirect).toBe('manual')
  })

  it('sends form fields as a URL-encoded POST body', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }))
    await fetchJson('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
      form: { kakuzuke_id: 1, page: 1 },
    })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('kakuzuke_id=1&page=1')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    )
  })

  it('does not retry on 404', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 404, statusText: 'Not Found' }))
    await expect(
      fetchJson('https://example.test/missing', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: noSleep,
      })
    ).rejects.toBeInstanceOf(HttpError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('gives up after the configured number of attempts', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { status: 500, statusText: 'Boom' }))
    await expect(
      fetchJson('https://example.test', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: noSleep,
        attempts: 2,
      })
    ).rejects.toThrow(/HTTP 500 Boom/)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('treats a timeout as a retryable failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('The operation was aborted', 'TimeoutError'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const result = await fetchJson('https://example.test', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(result).toEqual({ ok: true })
  })
})
