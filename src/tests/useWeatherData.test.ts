import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWeatherData } from '../hooks/useWeatherData'

const { mockSocket, mockFetchMeasurements, triggerSocketEvent } = vi.hoisted(() => {
  type Callback = (...args: unknown[]) => void
  const listeners: Record<string, Callback> = {}

  const socket = {
    on: vi.fn((event: string, cb: Callback) => {
      listeners[event] = cb
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    auth: {} as Record<string, string>,
  }

  const fetchMock = vi.fn().mockResolvedValue([])

  function trigger(event: string, ...args: unknown[]) {
    listeners[event]?.(...args)
  }

  return {
    mockSocket: socket,
    mockFetchMeasurements: fetchMock,
    triggerSocketEvent: trigger,
  }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

vi.mock('../services/api.ts', () => ({
  fetchLatestMeasurements: mockFetchMeasurements,
}))

describe('useWeatherData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits get_latest on socket connect and sets isConnected', () => {
    const { result } = renderHook(() => useWeatherData())

    act(() => {
      triggerSocketEvent('connect')
    })

    expect(mockSocket.emit).toHaveBeenCalledWith('get_latest')
    expect(result.current.isConnected).toBe(true)
  })

  it('sets measurements on latest_measurements event', () => {
    const { result } = renderHook(() => useWeatherData())
    const mockData = [
      { id: 1, temperature: 25, humidity: 60, device_id: 'sensor_1', created_at: '2026-01-01T00:00:00Z' },
    ]

    act(() => {
      triggerSocketEvent('latest_measurements', mockData)
    })

    expect(result.current.measurements).toEqual(mockData)
    expect(result.current.lastUpdated).toBeInstanceOf(Date)
    expect(result.current.error).toBeNull()
  })

  it('prepends new measurement on new_measurement event', () => {
    const { result } = renderHook(() => useWeatherData())
    const initial = [
      { id: 1, temperature: 25, humidity: 60, device_id: 'sensor_1', created_at: '2026-01-01T00:00:00Z' },
    ]

    act(() => {
      triggerSocketEvent('latest_measurements', initial)
    })

    const newMeasurement = {
      id: 2, temperature: 26, humidity: 61, device_id: 'sensor_1',
      created_at: '2026-01-01T00:01:00Z',
    }

    act(() => {
      triggerSocketEvent('new_measurement', newMeasurement)
    })

    expect(result.current.measurements).toHaveLength(2)
    expect(result.current.measurements[0]).toEqual(newMeasurement)
  })

  it('starts fallback HTTP polling if socket does not connect within 10s', async () => {
    const pollData = [
      { id: 1, temperature: 25, humidity: 60, created_at: '2026-01-01T00:00:00Z' },
    ]
    mockFetchMeasurements.mockResolvedValue(pollData)

    const { result } = renderHook(() => useWeatherData())

    await act(async () => {
      vi.advanceTimersByTime(10000)
    })

    expect(mockFetchMeasurements).toHaveBeenCalled()
    expect(result.current.measurements).toEqual(pollData)
    expect(result.current.isConnected).toBe(true)
  })

  it('stops polling when socket connects after fallback started', async () => {
    mockFetchMeasurements.mockResolvedValue([])
    renderHook(() => useWeatherData())

    await act(async () => {
      vi.advanceTimersByTime(10000)
    })

    const pollCallCount = mockFetchMeasurements.mock.calls.length
    expect(pollCallCount).toBeGreaterThan(0)

    act(() => {
      triggerSocketEvent('connect')
    })

    const pollCallCountAfter = mockFetchMeasurements.mock.calls.length
    expect(pollCallCountAfter).toBe(pollCallCount)
  })

  it('resumes HTTP polling after socket disconnect', async () => {
    mockFetchMeasurements.mockResolvedValue([])
    renderHook(() => useWeatherData())

    act(() => {
      triggerSocketEvent('connect')
      triggerSocketEvent('latest_measurements', [
        { id: 1, temperature: 25, humidity: 60, created_at: '2026-01-01T00:00:00Z' },
      ])
    })

    expect(mockFetchMeasurements).not.toHaveBeenCalled()

    await act(async () => {
      triggerSocketEvent('disconnect')
    })

    expect(mockFetchMeasurements).toHaveBeenCalled()
  })

  it('shows error on connect_error when no data received', () => {
    const { result } = renderHook(() => useWeatherData())

    act(() => {
      triggerSocketEvent('connect_error', new Error('Connection refused'))
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toContain('Connection refused')
  })

  it('refreshes token on connect_error with Invalid token', () => {
    localStorage.setItem('auth_token', 'new-token-value')
    renderHook(() => useWeatherData())

    act(() => {
      triggerSocketEvent('connect_error', new Error('Invalid token'))
    })

    expect(mockSocket.auth.token).toBe('new-token-value')
    expect(mockSocket.connect).toHaveBeenCalled()
  })

  it('disconnects socket on unmount', () => {
    const { unmount } = renderHook(() => useWeatherData())

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})
