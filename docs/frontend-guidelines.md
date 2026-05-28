# Frontend Engineering Guidelines

Derived from the `weather_monitoring_frontend` codebase. These rules reflect the current architecture; deviations require explicit justification.

---

## Naming Conventions

| Category | Convention | Examples | Rule |
|---|---|---|---|
| Component files | PascalCase | `TemperatureChart.tsx`, `CurrentIndicators.tsx` | Must match the exported component name |
| Non-component files | camelCase | `useWeatherData.ts`, `api.ts` | Hooks, services, utilities |
| Component exports | Named export | `export function Header` | Never `export default` for components |
| App root export | Default export | `export default App` | Only `App.tsx` uses default |
| Props interfaces | PascalCase + `Props` suffix | `HeaderProps`, `ConnectionStatusProps` | One interface per component, colocated |
| Type/interface files | PascalCase, singular | `Measurement.ts` | File name matches type name |
| CSS classes | kebab-case | `indicator-card`, `connection-status`, `temp-hot` | No camelCase or BEM in class names |
| CSS files | Same name as component | `Dashboard.tsx` → `Dashboard.css` | Colocated with component |
| Test files | `{Component}.test.tsx` | `Header.test.tsx` | Mirrors component file name |
| Constants | UPPER_SNAKE_CASE | `API_BASE` | For module-level configuration values |
| Boolean props/state | `is` prefix | `isConnected`, `hasDataRef` | Hungarian-style prefix for booleans |

---

## React Component Standards

### Structure

Every component file follows this shape:

```tsx
// 1. Imports (third-party, then internal)
import { format } from 'date-fns'
import { LineChart, Line } from 'recharts'
import type { Measurement } from '../types/Measurement'

// 2. Props interface (colocated, not imported)
interface TemperatureChartProps {
  measurements: Measurement[]
}

// 3. Named function component
export function TemperatureChart({ measurements }: TemperatureChartProps) {
  // 4. Data transformations (before JSX)
  const data = [...measurements].reverse().map(...)

  // 5. JSX return
  return ( ... )
}
```

### Rules

1. **One component per file**. Never export multiple components from a single file.
2. **Named exports only** for components. `App.tsx` is the sole exception (default export for `createRoot`).
3. **Props interface is colocated** in the same file, immediately above the component. Do not import interfaces from shared files.
4. **Props are destructured** in the function signature, not in a separate body statement.
5. **No prop spreading** (`{...props}`) — every prop is explicit.
6. **No children prop usage** in the current codebase. If composition is needed, use explicit named props.
7. **No defaultProps** — use default parameter values instead.
8. **No class components** — function components only.

### JSX Rules

- Emojis serve as inline icons (🌡️💧⚠️). No icon library.
- CSS class names are raw strings in `className`. No `clsx` or `classnames` library.
- Conditional rendering uses `&&` and ternary, never an `if` statement inside JSX.

```tsx
// Correct
{lastUpdated && <p className="last-updated">...</p>}
{!latest && !error && <p className="loading">Loading data...</p>}

// Incorrect
{lastUpdated ? <p className="last-updated">...</p> : null}
```

---

## Hook Standards

### Rules

1. **One hook file per concern**. `useWeatherData` is the only hook — it owns all data-fetching state.
2. **Hooks return plain objects**, never JSX or component-like structures.
3. **State fields are flat objects** — no nested reducer or context.
4. **Return type is implicit** (no wrapping in a custom type or interface).
5. **No custom hook dependencies on other custom hooks**. `useWeatherData` imports only from `services/`.
6. **`useRef` is used for imperative tracking** (e.g., `hasDataRef` to track first-fetch status). Not used for DOM references.
7. **Effect cleanup is mandatory** when setting up intervals, timeouts, or subscriptions.

### Pattern

```tsx
export function useWeatherData() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  useEffect(() => {
    // ... poll logic ...
    return () => clearInterval(interval)
  }, [])

  return { measurements, lastUpdated, isConnected, error }
}
```

---

## API Layer Standards

### Rules

1. **A single `services/` file per API domain**. Currently `api.ts` for the weather measurements endpoint.
2. **API base URL is a module-level constant** (`API_BASE`). Hardcoded, not from env vars.
3. **Each endpoint gets one exported async function**. Currently: `fetchLatestMeasurements()`.
4. **Functions return parsed JSON** — no generic request wrapper or response interceptor.
5. **Error handling is minimal** — throws on non-ok response. Retry logic lives in the caller (currently absent).
6. **No request cancellation** (no `AbortController`).
7. **No request/response type mapping** — the API response shape matches the `Measurement` interface directly.

### Pattern

```tsx
const API_BASE = 'http://13.223.175.101:5000/api'

export async function fetchLatestMeasurements(): Promise<Measurement[]> {
  const response = await fetch(`${API_BASE}/measurements/latest`)
  if (!response.ok) throw new Error('Failed to fetch measurements')
  return response.json()
}
```

---

## Styling Standards

### Rules

1. **Global CSS files only** — no CSS Modules, CSS-in-JS, Tailwind, or CSS preprocessors.
2. **Each component with styles creates a colocated `.css` file** imported at the top of the component.
3. **Class names are kebab-case strings**. No BEM, no CSS custom properties, no `:root` variables.
4. **All styles are in `Dashboard.css`** currently — for consistency, keep all styles co-located there rather than splitting into per-component CSS files.
5. **No inline styles** (`style={{}}`) except for dynamic values that cannot be expressed in CSS (chart colors are hardcoded in component code, not in CSS).
6. **Color values are hardcoded** — no design tokens or theme variables.
7. **Responsive design** uses a single `@media (max-width: 768px)` breakpoint.
8. **Box shadows** follow a consistent pattern: `0 2px 12px rgba(0,0,0,0.08)`.
9. **Font stack**: `system-ui, -apple-system, sans-serif`.

### CSS Class Pattern

```css
/* BEM-like component prefix via kebab-case */
.indicator-card { ... }
.indicator-icon { ... }
.indicator-value { ... }
.indicator-label { ... }

/* State modifier: suffix after hyphen */
.temp-hot { ... }
.temp-cold { ... }
.temp-normal { ... }
```

---

## State Management Rules

1. **No state library** — React `useState` and `useEffect` are sufficient for this scope.
2. **No Context API** — all state flows through props from the single orchestrator `Dashboard`.
3. **No reducer** — state updates are simple assignments, not complex transformations.
4. **State lives as high as needed, as low as possible**. Currently: all fetch state in `useWeatherData`, derived state inline in `Dashboard`.
5. **Error state is differentiated**: initial-fetch errors show a user-facing message; subsequent-fetch errors only toggle `isConnected` without clearing displayed data (see `hasDataRef` guard).
6. **Derived state is computed in the component body**, not stored in state:
   ```tsx
   const latest = measurements.length > 0 ? measurements[0] : null
   const tempStatus = temperature > 35 ? 'hot' : temperature < 15 ? 'cold' : 'normal'
   ```
7. **No state persistence** (no localStorage, sessionStorage, or URL params).

---

## Folder Organization Rules

```
src/
├── components/     # UI components only. No business logic.
├── hooks/          # Custom React hooks. One file per hook.
├── services/       # API clients and external service integrations.
├── types/          # Shared TypeScript interfaces and types.
├── tests/          # Test files, one per component, `*.test.tsx`.
├── assets/         # Static assets (currently unused but directory exists).
├── App.tsx         # Root component.
├── App.css         # Root styles.
└── main.tsx        # Entry point.
```

### Rules

1. **No nested subdirectories** inside `components/`, `hooks/`, `services/`, or `types/`. Every file is flat within its category.
2. **No barrel files** (no `index.ts` re-exports). Files are imported by their full path.
3. **Test files live in `src/tests/`**, not colocated with components. File name mirrors component name: `Header.tsx` → `Header.test.tsx`.
4. **CSS files are colocated with their component** in `components/`.
5. **No `utils/` or `helpers/` directory** — keep utilities minimal and avoid creating these unless a clear pattern emerges.
6. **No `constants/` directory** — constants are defined at the top of the file that uses them.

---

## Testing Standards

### Rules

1. **Framework**: Vitest (configured in `vite.config.ts`).
2. **Render environment**: jsdom.
3. **DOM matchers**: `@testing-library/jest-dom` imported globally via `src/tests/setup.ts`.
4. **Test file location**: `src/tests/{Component}.test.tsx`.
5. **One describe block per component**, multiple `it` blocks for scenarios.
6. **Imports**: Always import `describe`, `it`, `expect` from `vitest` (despite `globals: true`).
7. **Render function**: `@testing-library/react`'s `render` and `screen`.
8. **No snapshot tests**. No Storybook. No Playwright/Cypress.
9. **No test for `Dashboard.tsx` or hooks** currently — this is a coverage gap, not a rule.

### Pattern

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComponentName } from '../components/ComponentName'

describe('ComponentName', () => {
  it('renders expected text', () => {
    render(<ComponentName prop1={value} />)
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
})
```

### Current State

| Component | Tested | Notes |
|---|---|---|
| `Header` | ✅ | Title, author, timestamp rendering |
| `CurrentIndicators` | ✅ | Values, hot/normal CSS class |
| `ConnectionStatus` | ✅ | Live/Reconnecting text, error message |
| `Dashboard` | ❌ | No tests |
| `TemperatureChart` | ❌ | No tests |
| `HumidityChart` | ❌ | No tests |
| `useWeatherData` | ❌ | No tests |
| `api.ts` | ❌ | No tests |

---

## Reusability Rules

1. **No generic/reusable components exist yet**. Every component is purpose-built for the dashboard.
2. **Duplication is acceptable** when components serve distinct visual domains. `TemperatureChart` and `HumidityChart` are 90% identical by design — they share a layout (`chart-card`) but differ in data key, color, and label. Extract into a shared `LineChartCard` only when a third variant appears.
3. **Props are explicit and minimal** — no catch-all `...rest` or generic object props.
4. **No higher-order components or render props**.
5. **No compound components or context-based composition**.
6. **When creating a reusable component**, colocate it in `components/` and use the naming conventions above. A reusable variant gets a descriptive name, not `Generic` or `Base`.

---

## TypeScript Guidelines

### Config (from `tsconfig.app.json`)

| Setting | Value | Implication |
|---|---|---|
| `target` | `es2023` | Use modern JS features (optional chaining, nullish coalescing) |
| `verbatimModuleSyntax` | `true` | Must use `import type` for type-only imports; must include file extensions |
| `jsx` | `react-jsx` | No `React` import needed for JSX |
| `noUnusedLocals` | `true` | Unused variables are errors |
| `noUnusedParameters` | `true` | Unused params are errors (prefix with `_` if intentional) |
| `noEmit` | `true` | TypeScript does not emit files — Vite handles bundling |
| `erasableSyntaxOnly` | `true` | No `enum`, no `namespace`, no `constructor parameter properties` |

### Rules

1. **`import type` for type-only imports**:
   ```tsx
   import type { Measurement } from '../types/Measurement'
   import { format } from 'date-fns'  // value import
   ```
2. **File extensions required** in all imports: `from './Component.tsx'`, not `from './Component'`.
3. **Interfaces over types** for object shapes:
   ```tsx
   // Correct
   interface Measurement {
     created_at: string
     humidity: number
     temperature: number
   }

   // Avoid for objects
   type Measurement = { ... }
   ```
4. **No `any`** — use `unknown` and assert when necessary.
5. **No `enums`** — use `as const` or union types instead (enforced by `erasableSyntaxOnly`).
6. **No `namespace` or `module` declarations**.
7. **Function return types are inferred**, not explicitly annotated, unless the function signature benefits from documentation.
8. **React component props are typed via interface**, never inline:
   ```tsx
   // Correct
   interface Props { ... }
   export function Header({ lastUpdated }: Props)

   // Incorrect
   export function Header({ lastUpdated }: { lastUpdated: Date | null })
   ```

---

## Performance Guidelines

### Current State

- **Polling interval**: 5 seconds. Creates a `setInterval` that fires even when the tab is backgrounded.
- **No memoization**: No `useMemo`, `useCallback`, or `React.memo` anywhere.
- **Re-renders**: Every poll triggers a re-render of `Dashboard` and all children, even if the data is identical.
- **Chart data transform**: `[...measurements].reverse().map(...)` runs on every render inside the chart components (not memoized).

### Rules

1. **Do not add `useMemo` or `useCallback` preemptively** — only when profiling shows a bottleneck.
2. **Do not add `React.memo` to leaf components** unless they re-render with identical props more than necessary.
3. **Keep transforms minimal in JSX**. Heavy data mapping belongs in the hook or in a `useMemo` if proven slow.
4. **Be aware of `StrictMode` double-mounting**: effects fire twice in development. The production build does not have this behavior.
5. **The polling interval (5s) is tied to the sensor send rate (~10s)**. Do not change the interval without understanding the backend's data production rate.
6. **No image optimization, code splitting, or lazy loading** is currently used. These are not needed for a single-page dashboard with zero images.

### Future Considerations

- Add `visibilitychange` listener to pause polling when the tab is hidden.
- Compare incoming data with current state to prevent unnecessary re-renders.
- Memoize chart data transforms if the measurement array grows beyond ~100 entries.
- Use `AbortController` to cancel in-flight requests when the component unmounts or the next poll fires.

---

## Summary: Code Review Checklist

Before committing, verify:

- [ ] Named export for components, default export only in `App.tsx`
- [ ] `.tsx` extension on all local imports
- [ ] `import type` for type-only imports
- [ ] Props interface colocated and destructured in signature
- [ ] No `any`, no `enum`, no `namespace`
- [ ] CSS class names are kebab-case raw strings
- [ ] Effect has cleanup function
- [ ] Error state does not overwrite displayed data on reconnect
- [ ] `npm run build` passes (typecheck + bundle)
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
