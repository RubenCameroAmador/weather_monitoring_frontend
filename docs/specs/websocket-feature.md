# WebSocket Integration — Feature Specification

## 1. Problem Statement

The frontend currently polls `GET /api/measurements/latest` every 5 seconds via `fetchLatestMeasurements()` in `useWeatherData`. This is inefficient — data arrives up to 5s late, and most polls return the same data.

The backend now exposes a **Flask-SocketIO** endpoint that pushes real-time measurements via WebSocket.

## 2. Decisions

| Decision | Chosen | Rationale |
|---|---|---|
| **Client library** | `socket.io-client@4` | Matches Flask-SocketIO on the backend |
| **WS URL** | Derived from `VITE_API_BASE` (strip `/api`) | Zero config changes; same host |
| **Auth on connect** | `auth: { token }` in connection options | JWT sent at handshake time |
| **Initial data** | `emit("get_latest")` on connect → `latest_measurements` response | Single round-trip, avoids initial poll |
| **Real-time updates** | `socket.on("new_measurement")` → prepend to array | Newest-first, matches API ordering |
| **Reconnection** | Socket.IO built-in (infinite attempts, 1–5s backoff) | Handles network blips transparently |
| **Token expiry** | `connect_error` → read fresh token from localStorage → `socket.connect()` | Survives session refresh without page reload |
| **Fallback** | HTTP polling starts 10s after mount if socket hasn't connected | Graceful degradation if WS unavailable |
| **Disconnect recovery** | Socket disconnects → HTTP polling resumes; socket reconnects → polling stops | Best-effort delivery |
| **Measurement type** | Add `id?: number` and `device_id?: string` | Match WS payload shape |

## 3. Architecture

### Before

```
useWeatherData
  └─ setInterval(5000)
       └─ fetchLatestMeasurements()
            └─ GET /api/measurements/latest
            ← Measurement[]
```

### After

```
useWeatherData
  ├─ createSocket() [on mount]
  │    └─ io(socketUrl, { auth: { token } })
  │
  ├─ Socket connected ──────────────────────────────────────────────┐
  │  ├─ emit("get_latest")                                          │
  │  ├─ on("latest_measurements") → setMeasurements(data)           │
  │  └─ on("new_measurement") → setMeasurements(prev => [d, ...p]) │
  │                                                                  │
  ├─ Socket fails (10s timeout) ──→ Fallback HTTP polling (5s) ─────┤
  │                                                                  │
  └─ Socket reconnects ──→ stop polling, back to WS mode ───────────┘
```

**Dashboard.tsx does not change** — hook interface (`{ measurements, lastUpdated, isConnected, error }`) is identical.

## 4. Files Changed

| File | Change |
|---|---|
| `package.json` | Add `socket.io-client` to `dependencies` |
| `src/types/Measurement.ts` | Add `id?: number`, `device_id?: string` |
| `src/services/socket.ts` | **NEW** — `createSocket()`, `handleTokenRefresh()`, WS event type exports |
| `src/hooks/useWeatherData.ts` | Rewrite: WebSocket primary, HTTP fallback after 10s, same return shape |
| `nginx.conf` | Add `location /socket.io/` with WebSocket upgrade headers |
| `src/tests/useWeatherData.test.ts` | **NEW** — 9 tests: connect, events, fallback, reconnect, token refresh, cleanup |

## 5. Hook Behaviour (useWeatherData.ts)

### State fields (unchanged)

```
measurements: Measurement[]    ← from WS latest_measurements or new_measurement
lastUpdated: Date | null       ← timestamp of last successful data
isConnected: boolean           ← true if WS connected OR HTTP poll succeeds
error: string | null           ← only set on initial connect failure
```

### Event handlers

| Event | Handler |
|---|---|
| `connect` | `setIsConnected(true)`, stop fallback timer, `emit("get_latest")` |
| `latest_measurements` | `setMeasurements(data)`, `setLastUpdated(now)`, clear error |
| `new_measurement` | `setMeasurements(prev => [data, ...prev])`, `setLastUpdated(now)` |
| `disconnect` | `setIsConnected(false)`, start HTTP polling if has data |
| `connect_error` | `setIsConnected(false)`, set error if no data; if "Invalid token" → `handleTokenRefresh(socket)` |

### Fallback

- **10s timeout** after mount: if socket hasn't connected, start `setInterval(fetchLatestMeasurements, 5000)`
- On socket `connect`: stop polling, clear fallback timer
- On socket `disconnect` (after having data): restart polling
- Polling sets `isConnected=true` on success (HTTP = connected)

## 6. Socket Service (src/services/socket.ts)

```typescript
export function createSocket(): Socket
  // - Reads VITE_API_BASE, strips /api suffix
  // - Reads auth_token from localStorage
  // - Returns io(socketUrl, { auth: { token }, reconnection: true, ... })

export function handleTokenRefresh(socket: Socket): void
  // - Reads fresh auth_token from localStorage
  // - Sets socket.auth = { token: newToken }
  // - Calls socket.connect()

export interface NewMeasurementPayload { id, temperature, humidity, device_id, created_at }
export type LatestMeasurementsPayload = Measurement[]
```

## 7. Nginx Changes (nginx.conf)

Added after existing `/api/` block:

```nginx
location /socket.io/ {
    proxy_pass http://192.168.20.167:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 8. Testing (useWeatherData.test.ts)

9 tests covering:

| # | Test | Scenario |
|---|---|---|
| 1 | Connect → emit get_latest | `triggerSocketEvent('connect')` → `mockSocket.emit` called with `'get_latest'`, `isConnected = true` |
| 2 | latest_measurements sets data | Receive array → `measurements` updated, `lastUpdated` set, error cleared |
| 3 | new_measurement prepends | Existing data + new measurement → length +1, `measurements[0]` is new item |
| 4 | Fallback after 10s | Advance timers 10s → `fetchLatestMeasurements` called, data populated |
| 5 | Socket stops fallback on connect | Fallback started → socket connects → polling calls stop |
| 6 | Disconnect resumes polling | Socket connected → disconnect → `fetchLatestMeasurements` called |
| 7 | connect_error with no data | Error shown, `isConnected = false` |
| 8 | Invalid token refresh | `localStorage` has new token → `connect_error("Invalid token")` → socket auth updated, `.connect()` called |
| 9 | Cleanup on unmount | `unmount()` → `socket.disconnect()` called |

## 9. Verification

```bash
npm run lint     # 0 errors
npm run build    # tsc -b + vite build passes
npm run test     # 38 tests pass (8 files)
```

## 10. Rollback

To revert to HTTP polling only:
1. Revert `src/hooks/useWeatherData.ts` to original polling implementation
2. Remove `src/services/socket.ts`
3. Remove `socket.io-client` from `package.json`
4. Remove `/socket.io/` block from `nginx.conf`
5. Delete `src/tests/useWeatherData.test.ts`
