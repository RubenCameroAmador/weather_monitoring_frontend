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

Single-page React 19 + TypeScript app. No router, no state library.

```
src/
├── components/       # 6 UI components, each with named export
│   ├── Dashboard.tsx # Orchestrator — calls useWeatherData, renders children
│   ├── Header.tsx    # Title, author, last-updated timestamp
│   ├── ConnectionStatus.tsx  # Live / Reconnecting dot
│   ├── CurrentIndicators.tsx # Temp & humidity cards (color-coded)
│   ├── TemperatureChart.tsx  # Recharts line chart (red #ff6b6b)
│   └── HumidityChart.tsx     # Recharts line chart (teal #4ecdc4)
├── hooks/
│   └── useWeatherData.ts     # HTTP polling every 5s via fetchLatestMeasurements
├── services/
│   └── api.ts                # fetchLatestMeasurements → GET /api/measurements/latest
├── types/
│   └── Measurement.ts        # { created_at, humidity, temperature }
└── tests/                    # Vitest + RTL, one test file per component
```

Data flow: `api.ts` → `useWeatherData` (polling) → `Dashboard` → child components via props.

## Key details

- **API base**: hardcoded in `src/services/api.ts` as `http://13.223.175.101:5000/api`. Change there or in `nginx.conf` for deployment.
- **No OpenCode config** found in repo (no `opencode.json`).
- **CSS is global** (no CSS modules or CSS-in-JS). Class names come from raw strings.
- **Charts reverse data** (API returns newest-first, charts show chronological left-to-right).
- **Imports use `.tsx` extension** (required by `verbatimModuleSyntax` in tsconfig).
- **`StrictMode`** is enabled in `main.tsx` — effects fire twice in dev.
- **Emojis** used as icons in components (🌡️💧⚠️).
- **`src/tests/setup.ts`** imports `@testing-library/jest-dom` globally (configured in `vite.config.ts` under `test.setupFiles`).
