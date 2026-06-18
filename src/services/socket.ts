import { io, type Socket } from 'socket.io-client'
import type { Measurement } from '../types/Measurement'

const TOKEN_KEY = 'auth_token'

export function createSocket(): Socket {
  const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api'
  const socketUrl = apiBase.replace(/\/api\/?$/, '')
  const token = localStorage.getItem(TOKEN_KEY)

  return io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
}

export function handleTokenRefresh(socket: Socket): void {
  const newToken = localStorage.getItem(TOKEN_KEY)
  if (newToken) {
    socket.auth = { token: newToken }
    socket.connect()
  }
}

export interface NewMeasurementPayload {
  id: number
  temperature: number
  humidity: number
  device_id: string
  created_at: string
}

export type LatestMeasurementsPayload = Measurement[]
