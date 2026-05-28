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

## Setup

```bash
npm install
npm run dev
```

The app starts at `http://localhost:5173` and redirects to `/login`.

## Credentials

Default login credentials (provided by the backend):
- **Username**: `Ruben`
- **Password**: `1234`

## Testing

```bash
npm run test
```

## API

The API base URL is configurable via the `VITE_API_BASE` environment variable (see `.env`).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/login` | No | Authenticate, returns `{ access_token }` |
| GET | `/api/measurements/latest` | Yes (Bearer) | Latest sensor measurements |

In production, `/api/` is proxied through Nginx (see `nginx.conf`).

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router v7 (client-side routing)
- Recharts (charts)
- date-fns (date formatting)
- Vitest + React Testing Library (tests)
