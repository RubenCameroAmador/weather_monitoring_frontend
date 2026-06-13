# Weather Monitoring Dashboard

Real-time weather monitoring dashboard built with React, TypeScript, and Vite.

## Author

Rubén Camero

## Features

- Real-time data via HTTP polling (5s interval)
- Temperature and humidity line charts (Recharts)
- Current value indicator cards with color-coded status
- Connection status indicator (Live / Reconnecting)
- Last updated timestamp
- Fully responsive (mobile-friendly)
- Bearer-token authentication (login page + protected dashboard)
- Automatic token refresh (transparent 401 → refresh → retry)

## Project Structure

Each component lives in its own folder with a colocated CSS file:

```
src/
├── components/
│   ├── Dashboard/
│   ├── Header/
│   ├── ConnectionStatus/
│   ├── CurrentIndicators/
│   ├── TemperatureChart/
│   ├── HumidityChart/
│   ├── LoginPage/
│   └── ProtectedRoute/
├── contexts/
├── hooks/
├── services/
├── types/
└── tests/
```

## Setup

```bash
npm install
npm run dev
```

The app starts at `http://localhost:5173` and redirects to `/login`.

## Testing

```bash
npm run test
```

## API

The API base URL is configurable via the `VITE_API_BASE` environment variable (see `.env`).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/login` | No | Authenticate, returns `{ access_token, refresh_token }` |
| POST | `/api/refresh` | Bearer (refresh token) | Exchange refresh token for a new `{ access_token }` |
| GET | `/api/measurements/latest` | Yes (Bearer) | Latest sensor measurements |

In production, `/api/` is proxied through Nginx (see `nginx.conf`).

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router v7 (client-side routing)
- Recharts (charts)
- date-fns (date formatting)
- Vitest + React Testing Library (tests)
