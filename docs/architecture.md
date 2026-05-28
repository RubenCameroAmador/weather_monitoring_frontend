# Architecture Document

## Project Overview

A real-time weather monitoring dashboard built with **React 19**, **TypeScript**, and **Vite**. Displays live temperature and humidity data from an IoT sensor via HTTP polling, presented as color-coded indicator cards and Recharts line charts.

---

## Folder Structure

```
weather_monitoring_frontend/
├── src/
│   ├── components/           # 6 UI components
│   │   ├── Dashboard.tsx     # Orchestrator — root layout, data prop forwarding
│   │   ├── Dashboard.css     # All dashboard & child styles (single CSS file)
│   │   ├── Header.tsx        # Title, author, last-updated timestamp
│   │   ├── ConnectionStatus.tsx  # Live / Reconnecting status dot
│   │   ├── CurrentIndicators.tsx # Temperature & humidity cards
│   │   ├── TemperatureChart.tsx  # Line chart for temperature
│   │   └── HumidityChart.tsx     # Line chart for humidity
│   ├── hooks/
│   │   └── useWeatherData.ts # Data fetching hook (HTTP polling every 5s)
│   ├── services/
│   │   └── api.ts            # HTTP client — fetchLatestMeasurements()
│   ├── types/
│   │   └── Measurement.ts    # Measurement interface
│   ├── tests/
│   │   ├── setup.ts          # jest-dom matchers (global import)
│   │   ├── Header.test.tsx
│   │   ├── CurrentIndicators.test.tsx
│   │   └── ConnectionStatus.test.tsx
│   ├── App.tsx               # Root component — renders <Dashboard />
│   ├── App.css               # Body / #root reset styles
│   └── main.tsx              # Entry point — createRoot + StrictMode
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html                # Vite HTML entry (root div, script → main.tsx)
├── package.json
├── vite.config.ts            # Vite + Vitest config
├── tsconfig.json             # References app + node tsconfigs
├── tsconfig.app.json         # App source config (verbatimModuleSyntax, react-jsx)
├── tsconfig.node.json        # Config for vite.config.ts
├── eslint.config.js          # ESLint flat config (tseslint + react-hooks)
├── Dockerfile                # Multi-stage: node:22-alpine build → nginx serve
├── docker-compose.yml        # Exposes port 80, uses Dockerfile
├── nginx.conf                # SPA routing + /api/ proxy + static caching
├── README.md
├── IMPLEMENTATION_GUIDE.md   # Step-by-step doc (written during development)
└── AGENTS.md                 # OpenCode agent instructions
```

---

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **State management** | React `useState` / `useEffect` | Single page, single data source — no router or state library needed |
| **Real-time strategy** | HTTP polling (5s) | Backend has no WebSocket endpoint; simple and reliable |
| **Charting** | Recharts | Declarative, React-native, lightweight |
| **Styling** | Plain CSS (global) | Minimal CSS — no CSS-in-JS / Tailwind overhead for < 100 lines |
| **TypeScript** | Strict mode with `verbatimModuleSyntax` | Forces explicit `.tsx` extension in imports |
| **Testing** | Vitest + jsdom + RTL | Native Vite integration, no Jest migration needed |
| **Deployment** | Docker multi-stage → Nginx | Static SPA served by Nginx with API proxy; no Node in production |
| **SPA routing** | Nginx `try_files` | Enables direct URL access if router is added later |

---

## Current Patterns

### Component Communication Flow

```
main.tsx
  └─ App.tsx
       └─ Dashboard.tsx  (orchestrator)
            ├─ Header(lastUpdated)
            ├─ ConnectionStatus(isConnected, error)
            ├─ CurrentIndicators(temperature, humidity)
            ├─ TemperatureChart(measurements)
            └─ HumidityChart(measurements)
```

- **Unidirectional**: Data flows down via props only. No callback props, no context, no children composition.
- **One orchestrator**: `Dashboard` is the sole integration point — it calls the hook and distributes data.
- **No component composition**: All children are hard-coded in `Dashboard.tsx`.

### State Flow

```
useWeatherData hook
  ├─ measurements: Measurement[]   ← latest API response (full array)
  ├─ lastUpdated: Date | null      ← timestamp of last successful fetch
  ├─ isConnected: boolean          ← true if last fetch succeeded
  └─ error: string | null          ← error message on initial fetch failure

Dashboard derives:
  └─ latest = measurements[0]      ← newest measurement for indicator cards
```

- **Single hook instance** per page (rendered once in `Dashboard`).
- **No shared state** between components; each child receives only its needed slice.
- **Error state** only set on initial failure (`hasDataRef` prevents overwriting data with error on reconnect blips).

### Data Fetching

```typescript
// api.ts
fetchLatestMeasurements() → GET http://13.223.175.101:5000/api/measurements/latest
                          → returns Measurement[]

// useWeatherData.ts
useEffect with setInterval(5000) — fires immediately, then every 5s
  - On success: updates measurements, lastUpdated, sets isConnected=true
  - On failure: sets isConnected=false, sets error only if never had data
  - Cleanup: clearInterval on unmount
```

- **Polling interval**: 5 seconds (matches sensor send rate of ~10s).
- **No caching, deduplication, or retry logic**.
- **API base URL** hardcoded in `api.ts`. Override in `nginx.conf` for production.

### Styling Strategy

- **Global CSS files**: `App.css` (body/reset) and `Dashboard.css` (all component styles).
- **Class naming**: kebab-case strings (e.g., `connection-status`, `indicator-card`, `temp-hot`).
- **No CSS modules**: Raw class names in `className` attributes — potential for collisions.
- **Responsive**: CSS Grid with `grid-template-columns: 1fr 1fr` → `1fr` at 768px breakpoint.
- **Color coding**: Indicator values change color based on thresholds (temp: hot>35, cold<15; humidity: high>80, low<30).
- **Shadows**: Consistent `box-shadow: 0 2px 12px rgba(0,0,0,0.08)` on cards.
- **Font**: `system-ui, -apple-system, sans-serif` stack.

### Testing Setup

- **Framework**: Vitest (configured in `vite.config.ts` under `test`).
- **Environment**: jsdom.
- **Globals**: `globals: true` — no need to import `describe`/`it`/`expect` (though tests do import them).
- **Setup**: `src/tests/setup.ts` imports `@testing-library/jest-dom` for DOM matchers.
- **Coverage**: 3 test files covering `Header`, `CurrentIndicators`, `ConnectionStatus`. No tests for `Dashboard`, `TemperatureChart`, `HumidityChart`, `useWeatherData`, or `api.ts`.
- **Pattern**: Light DOM testing (render + screen queries + container.querySelector for CSS classes).

### Naming Conventions

| Layer | Convention | Examples |
|---|---|---|
| Files | PascalCase for components, camelCase for hooks/services | `Header.tsx`, `useWeatherData.ts`, `api.ts` |
| Exports | Named exports for components, default export for `App` | `export function Header` |
| Props | PascalCase interface per component | `HeaderProps`, `ConnectionStatusProps` |
| CSS classes | kebab-case | `indicator-card`, `connection-status`, `last-updated` |
| Types | PascalCase, singular | `Measurement` |

### Environment Configuration

- **No `.env` files** or environment variables.
- **API URL** hardcoded in `src/services/api.ts:3`.
- **Nginx proxy** rewrites `/api/` to backend in production (`nginx.conf:13`).
- **Docker build** uses `npm ci` (not `npm install`) for reproducible builds.

---

## Recommended Improvements

### Architecture & Patterns

1. **Extract chart wrapper**: `TemperatureChart` and `HumidityChart` are 90% identical — create a shared `<LineChartCard>` component with a `dataKey`, `color`, `label` props.
2. **Add composition to Dashboard**: Accept children or slots instead of hard-coding every child, making testing and extension easier.
3. **Extract temperature/humidity threshold config**: Move `35`, `15`, `80`, `30` from `CurrentIndicators.tsx` into a constants file.

### Testing

4. **Cover missing units**: Add tests for `Dashboard`, `TemperatureChart`, `HumidityChart`, `useWeatherData`, `api.ts`.
5. **Add integration test**: Mock the API and verify the full render cycle from `Dashboard`.
6. **Avoid `container.querySelector`**: Use Testing Library queries (e.g., `getByRole`, `getByTestId`) instead of CSS class queries for more resilient tests.

### Data & Performance

7. **Add deduplication**: `useWeatherData` does not compare incoming data — every 5s the same 10 items cause a re-render.
8. **Retry logic**: `api.ts` has no retry or timeout — a single network blip sets `isConnected=false` until next poll.
9. **Consider WebSocket upgrade**: If backend adds a WS endpoint, switch `useWeatherData` to `new WebSocket()` with auto-reconnect.

### Infrastructure

10. **Use environment variables**: Move `API_BASE` to `VITE_API_BASE` env var instead of hardcoding.
11. **Health check in Dockerfile**: Add a health check to `docker-compose.yml`.

### Code Quality

12. **Remove unused deps from `dependencies`**: `@testing-library/jest-dom`, `@testing-library/react`, `jsdom`, `vitest` are dev-only and should be in `devDependencies`.
13. **Remove stale `IMPLEMENTATION_GUIDE.md`**: It duplicates information now in `AGENTS.md` and `docs/architecture.md`, and has drifted from the actual code.

---

## Key Quirks & Gotchas

| Quirk | Detail |
|---|---|
| **Imports need `.tsx`** | `verbatimModuleSyntax` requires `from './Component.tsx'` — omitting the extension breaks the build |
| **Charts display reversed data** | API returns newest-first; charts `.reverse()` for chronological left-to-right |
| **`StrictMode` double-fires effects** | In dev, `useEffect` fires twice — `setInterval` gets created + cleared + re-created on mount |
| **Error suppressed after first data** | `hasDataRef` prevents clearing displayed data on subsequent fetch failures |
| **Nginx rewrites `/api/` in production** | Frontend calls `/api/...` through Nginx proxy; in dev it calls the hardcoded IP directly |
| **No 404 or error page** | Any unknown route returns `index.html` (SPA catch-all); the app only shows the dashboard |
