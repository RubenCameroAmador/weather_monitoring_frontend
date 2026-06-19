# Weather Monitoring Dashboard

Real-time weather monitoring dashboard built with React 19, TypeScript, and Vite.

## Author

Rubén Camero

## Features

- Real-time data via HTTP polling (5s interval)
- Temperature and humidity line charts (Recharts)
- Current value indicator cards with color-coded status
- Trend indicators with ▲/▼ arrows and deltas
- Period statistics (min/max temp & humidity with timestamps)
- Comfort gauge (Thom discomfort index)
- Connection status indicator (Live / Reconnecting)
- Last updated timestamp
- Fully responsive (mobile-friendly)
- Dark mode toggle (🌙/☀️) with localStorage persistence
- Bearer-token authentication (login page + protected dashboard)
- User registration (username + password)
- Automatic token refresh (transparent 401 → refresh → retry)

## Project Structure

Each component lives in its own folder with a colocated CSS file:

```
src/
├── components/
│   ├── Dashboard/           # Orchestrator — root layout, data prop forwarding
│   ├── Header/              # Title, author, timestamp, theme toggle, logout
│   ├── ConnectionStatus/    # Live / Reconnecting dot
│   ├── CurrentIndicators/   # Temperature & humidity cards
│   ├── TemperatureChart/    # Temperature line chart (red)
│   ├── HumidityChart/       # Humidity line chart (teal)
│   ├── TrendIndicators/     # ▲/▼ arrows with delta values
│   ├── PeriodStats/         # Min/max statistics with timestamps
│   ├── ComfortGauge/        # Thermal comfort bar with Thom index
│   ├── ThemeToggle/         # 🌙/☀️ dark mode button
│   ├── LoginPage/           # Login form with validation
│   ├── RegisterPage/        # Registration form with validation
│   └── ProtectedRoute/      # Route guard for authenticated users
├── contexts/
│   ├── AuthContext.tsx       # Bearer token state + login/logout
│   └── ThemeContext.tsx      # Dark/light mode state
├── hooks/
│   └── useWeatherData.ts    # Data fetching (HTTP polling)
├── services/
│   └── api.ts               # HTTP client with token injection + refresh
├── types/
│   └── Measurement.ts       # Measurement interface
└── tests/                   # Vitest + RTL, one file per component
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

All tests use Vitest + React Testing Library with jsdom environment.

## API

The API base URL is configurable via the `VITE_API_BASE` environment variable (see `.env`).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Register new user (`{ username, password }`) |
| POST | `/api/login` | No | Authenticate, returns `{ access_token, refresh_token }` |
| POST | `/api/refresh` | Bearer (refresh token) | Exchange refresh token for a new `{ access_token }` |
| GET | `/api/measurements/latest` | Yes (Bearer) | Latest sensor measurements |

In production, `/api/` is proxied through Nginx (see `nginx.conf`).

## Deployment

See [docs/deployment-guide.md](docs/deployment-guide.md) for production deployment instructions (Docker, SSL, domain setup).

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router v7 (client-side routing)
- Recharts (charts)
- date-fns (date formatting)
- Vitest + React Testing Library (tests)
