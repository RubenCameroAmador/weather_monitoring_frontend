import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLatestMeasurements, loginUser } from '../services/api'

const mockFetch = vi.fn()

function mockResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('api', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches auth token from localStorage', async () => {
    localStorage.setItem('auth_token', 'test-token')
    mockFetch.mockResolvedValue(mockResponse(200, []))

    await fetchLatestMeasurements()

    const callHeaders = mockFetch.mock.calls[0][1].headers
    expect(callHeaders.Authorization).toBe('Bearer test-token')
  })

  it('makes request without auth when no token', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []))

    await fetchLatestMeasurements()

    const callHeaders = mockFetch.mock.calls[0][1].headers
    expect(callHeaders.Authorization).toBeUndefined()
  })

  it('throws on non-401 error with parsed message', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, { message: 'Server error' }))

    await expect(fetchLatestMeasurements()).rejects.toThrow('Server error')
  })

  it('throws on non-401 error without message', async () => {
    mockFetch.mockResolvedValue(mockResponse(502, null))

    await expect(fetchLatestMeasurements()).rejects.toThrow('Request failed: 502')
  })

  describe('401 with refresh token', () => {
    it('attempts refresh on 401 and retries request', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'valid-refresh')

      const measurements = [{ created_at: '2025-01-01', humidity: 50, temperature: 22 }]

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, { message: 'Token expired' }))
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'new-access-token' }))
        .mockResolvedValueOnce(mockResponse(200, measurements))

      const result = await fetchLatestMeasurements()

      expect(result).toEqual(measurements)
      expect(localStorage.getItem('auth_token')).toBe('new-access-token')
    })

    it('sends refresh token in Authorization header', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'my-refresh-token')

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, { message: 'Token expired' }))
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'new-token' }))
        .mockResolvedValueOnce(mockResponse(200, []))

      await fetchLatestMeasurements()

      const refreshCall = mockFetch.mock.calls[1]
      expect(refreshCall[0]).toContain('/refresh')
      expect(refreshCall[1].method).toBe('POST')
      expect(refreshCall[1].headers.Authorization).toBe('Bearer my-refresh-token')
    })

    it('retries original request with new token', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'my-refresh')

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, { message: 'Token expired' }))
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'new-access-token' }))
        .mockResolvedValueOnce(mockResponse(200, []))

      await fetchLatestMeasurements()

      const retryCall = mockFetch.mock.calls[2]
      expect(retryCall[1].headers.Authorization).toBe('Bearer new-access-token')
    })

    it('clears tokens and redirects on failed refresh', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'stale-refresh')

      const originalLocation = window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: originalLocation },
        writable: true,
      })

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, { message: 'Token expired' }))
        .mockResolvedValueOnce(mockResponse(401, { message: 'Invalid refresh token' }))

      await expect(fetchLatestMeasurements()).rejects.toThrow('Session expired')

      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(window.location.href).toBe('/login')
    })

    it('redirects to login when no refresh_token in localStorage', async () => {
      localStorage.setItem('auth_token', 'expired-token')

      const originalLocation = window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: originalLocation },
        writable: true,
      })

      mockFetch.mockResolvedValueOnce(mockResponse(401, { message: 'Token expired' }))

      await expect(fetchLatestMeasurements()).rejects.toThrow('Session expired')
      expect(window.location.href).toBe('/login')
    })
  })

  describe('refresh promise queue', () => {
    it('only makes one refresh call for concurrent 401s', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      localStorage.setItem('refresh_token', 'my-refresh')

      let refreshResolve: (v: unknown) => void
      const refreshBlock = new Promise((resolve) => {
        refreshResolve = resolve
      })

      mockFetch
        .mockResolvedValueOnce(mockResponse(401, {}))
        .mockResolvedValueOnce(mockResponse(401, {}))
        .mockResolvedValueOnce(mockResponse(401, {}))
        .mockImplementation((url: string) => {
          if (url.includes('/refresh')) {
            return refreshBlock.then(() =>
              mockResponse(200, { access_token: 'new-access-token' }),
            )
          }
          return Promise.resolve(mockResponse(200, []))
        })

      const results = Promise.all([
        fetchLatestMeasurements(),
        fetchLatestMeasurements(),
        fetchLatestMeasurements(),
      ])

      // Wait a tick so all 3 requests hit the 401 before refresh resolves
      await new Promise((r) => setTimeout(r, 0))

      function countRefreshCalls(): number {
        let count = 0
        for (const call of mockFetch.mock.calls) {
          if (typeof call[0] === 'string' && (call[0] as string).includes('/refresh')) {
            count++
          }
        }
        return count
      }

      // Check only one refresh call was made so far
      expect(countRefreshCalls()).toBe(1)

      // Let refresh resolve
      refreshResolve!(undefined)

      await results

      // Still only one refresh call total
      expect(countRefreshCalls()).toBe(1)
    })
  })

  describe('loginUser', () => {
    it('sends POST with username and password', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { access_token: 'abc', refresh_token: 'def' }),
      )

      await loginUser('ruben', 'secret')

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toContain('/login')
      expect(call[1].method).toBe('POST')
      expect(JSON.parse(call[1].body)).toEqual({ username: 'ruben', password: 'secret' })
    })

    it('returns access_token and refresh_token', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(200, { access_token: 'abc', refresh_token: 'def' }),
      )

      const result = await loginUser('ruben', 'secret')

      expect(result).toEqual({ access_token: 'abc', refresh_token: 'def' })
    })
  })
})
