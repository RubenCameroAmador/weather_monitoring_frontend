# Agents

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173, host `0.0.0.0`) |
| `npm run build` | `tsc -b && vite build` (typecheck **before** build) |
| `npm run test` | Run all Vitest tests |
| `npm run lint` | ESLint on `.` |
| `npm run preview` | Vite preview of production build |
| `docker compose up -d --build` | Build + serve behind Nginx on port 80 |

Run `lint` then `test` before committing. `build` is the full CI pipeline (typecheck + bundle).

## Architecture

React 19 + TypeScript SPA with client-side routing and bearer-token authentication.

Every component lives in its own folder (`components/{Name}/{Name}.tsx`) with its styles colocated (`components/{Name}/{Name}.css`).

```
src/
├── components/       # UI components, each in its own folder
│   ├── Dashboard/    # Orchestrator — calls useWeatherData, renders children
│   ├── Header/       # Title, author, last-updated timestamp, logout button
│   ├── ConnectionStatus/  # Live / Reconnecting dot
│   ├── CurrentIndicators/ # Temp & humidity cards (color-coded)
│   ├── TemperatureChart/  # Recharts line chart (red #ff6b6b)
│   ├── HumidityChart/     # Recharts line chart (teal #4ecdc4)
│   ├── LoginPage/         # Login form with validation + inline error
│   └── ProtectedRoute/    # Route guard — redirects to /login if unauthenticated
├── contexts/
│   └── AuthContext.tsx        # AuthProvider + useAuth hook (token in localStorage)
├── hooks/
│   └── useWeatherData.ts      # HTTP polling every 5s via fetchLatestMeasurements
├── services/
│   └── api.ts                 # apiRequest wrapper (token injection, 401 handling), loginUser, fetchLatestMeasurements
├── types/
│   └── Measurement.ts         # { created_at, humidity, temperature }
└── tests/                     # Vitest + RTL, one test file per component
```

Data flow: `api.ts` → `useWeatherData` (polling) → `Dashboard` → child components via props.

Routes: `/` redirects to `/dashboard` or `/login` based on auth state; `/login` is public; `/dashboard` is protected via `ProtectedRoute`.

## Key details

- **API base**: configurable via `VITE_API_BASE` env var (`.env` file); defaults to `http://13.223.175.101:5000/api`.
- **Auth**: bearer token stored in `localStorage` under key `auth_token`. Login endpoint: `POST /api/login` returns `{ access_token }`.
- **Token injection**: `apiRequest` wrapper in `src/services/api.ts` reads token from localStorage and sets `Authorization: Bearer <token>`. 401 responses clear the token and redirect to `/login`.
- **Logout**: local only (clears token, no backend call). Logout button in header top-right.
- **CSS is per-component** — each component folder has its own `.css` file. No shared stylesheets.
- **Charts reverse data** (API returns newest-first, charts show chronological left-to-right).
- **Imports use `.tsx` extension** (required by `verbatimModuleSyntax` in tsconfig).
- **`StrictMode`** is enabled in `main.tsx` — effects fire twice in dev.
- **Emojis** used as icons in components (🌡️💧⚠️).
- **`src/tests/setup.ts`** imports `@testing-library/jest-dom` globally (configured in `vite.config.ts` under `test.setupFiles`).
