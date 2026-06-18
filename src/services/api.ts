import type { Measurement } from '../types/Measurement'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api'
const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

let refreshingPromise: Promise<string> | null = null

function clearTokensAndRedirect() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.location.href = '/login'
}

async function attemptRefresh(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    clearTokensAndRedirect()
    throw new Error('Session expired')
  }

  const data = await response.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data.access_token
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (response.status === 401) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      clearTokensAndRedirect()
      throw new Error('Session expired')
    }

    if (!refreshingPromise) {
      refreshingPromise = attemptRefresh(refreshToken).finally(() => {
        refreshingPromise = null
      })
    }

    await refreshingPromise
    return apiRequest<T>(path, options)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchLatestMeasurements(): Promise<Measurement[]> {
  return apiRequest<Measurement[]>('/measurements/latest')
}

export async function registerUser(
  username: string,
  password: string,
): Promise<{ id: number; username: string }> {
  return apiRequest<{ id: number; username: string }>('/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string }> {
  return apiRequest<{ access_token: string; refresh_token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
