import type { Measurement } from '../types/Measurement'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api'

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
    throw new Error('Session expired')
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

export async function loginUser(
  username: string,
  password: string,
): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
