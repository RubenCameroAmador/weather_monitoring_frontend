# Dark Mode Feature Specification

## 1. Current Architecture Analysis

**Current state**: All components hardcode colors in their `.css` files. There is no theme system, no CSS custom properties, and no dark mode.

### All color values in the codebase

| Token | Current Value | Used In |
|---|---|---|
| Background page | `#f0f2f5` | `App.css`, `LoginPage.css`, `RegisterPage.css` |
| Card/surface | `#fff` | `Dashboard.css`, `CurrentIndicators.css`, `TemperatureChart.css`, `HumidityChart.css`, `LoginPage.css`, `RegisterPage.css` |
| Title/heading | `#1a1a2e` | `Header.css`, `LoginPage.css`, `RegisterPage.css` |
| Primary text | `#1a1a2e` | Button `background` in `LoginPage.css`, `RegisterPage.css` |
| Secondary text | `#666`, `#555`, `#888` | `Header.css`, `Dashboard.css`, `CurrentIndicators.css`, `LoginPage.css`, `RegisterPage.css` |
| Link color | `#4a90d9` | `LoginPage.css`, `RegisterPage.css` |
| Input border | `#ddd` | `LoginPage.css`, `RegisterPage.css` |
| Chart grid | `strokeDasharray="3 3"` | `TemperatureChart.tsx`, `HumidityChart.tsx` (hardcoded in component) |
| Box shadow | `0 2px 12px rgba(0,0,0,0.08)` | Every card/component |

### Theme toggle scope

| Screen | Has toggle? | Notes |
|---|---|---|
| Login page | ✅ New toggle | Left side, moon/sun icon |
| Register page | ✅ New toggle | Same toggle, left side |
| Dashboard | ✅ Header area | Top-left corner, same toggle |
| Charts | 🎨 Adapt colors | Grid, axis text, tooltip backgrounds |

---

## 2. Decisions (proposed)

| Decision | Chosen Option | Rationale |
|---|---|---|
| **State management** | `ThemeContext` (parallel to `AuthContext`) | Theme is cross-cutting — needed by every page. Using Context matches the existing `AuthContext` pattern |
| **Persistence** | `localStorage` key `theme` (`'light'` \| `'dark'`) | Survives page refresh and navigation; consistent with token storage pattern |
| **Implementation mechanism** | CSS custom properties (`:root` / `.dark`) on `<body>` | Single source of truth for all colors; avoids duplicating every color override in every `.css` file |
| **Toggle icon** | Emoji `🌙` / `☀️` | Follows existing emoji-as-icon convention (🌡️💧⚠️). No icon library needed |
| **Toggle position: Login/Register** | Top-left of the card, inside the card header area | Visible but does not distract from the form |
| **Toggle position: Dashboard** | Header top-left corner (opposite the logout button) | Symmetrical layout — logout right, theme left |
| **Chart adaptation** | Recharts props receive `stroke` and `strokeDasharray` based on theme | Charts are rendered via JSX props, not CSS — theme-aware values passed from component logic |

### Justified deviations from frontend-guidelines.md

| Rule | Deviation | Justification |
|---|---|---|
| "No CSS custom properties, no `:root` variables" | Introduce `:root` / `.dark` custom properties for colors | Required for a maintainable theme system. Without custom properties, every color override would need to be duplicated in every `.css` file (14+ files × ~8 colors each = 112+ overrides). Custom properties reduce this to a single definition block |
| "No Context API" | Add `ThemeContext` | Second Context in the app. Theme is cross-cutting across all pages and components — threading it via props from `App` through every child would be impractical |

---

## 3. Theme Context

### `src/contexts/ThemeContext.tsx`

Modeled after `AuthContext.tsx`:

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}
```

### Behavior

| Operation | Implementation |
|---|---|
| **Initialize** | Read from `localStorage.getItem('theme')`, default to `'light'` |
| **Toggle** | Switch `'light'` ↔ `'dark'`, write to `localStorage`, update `<body>` class |
| **Body class** | Add/remove `dark` class on `<body>` — CSS custom properties under `.dark` override `:root` |

### Body class management

```typescript
useEffect(() => {
  document.body.classList.toggle('dark', theme === 'dark')
}, [theme])
```

---

## 4. CSS Custom Properties

### `src/App.css` — base definitions

```css
:root {
  --bg-page: #f0f2f5;
  --bg-surface: #fff;
  --text-primary: #1a1a2e;
  --text-secondary: #666;
  --text-muted: #888;
  --text-label: #555;
  --border-input: #ddd;
  --shadow-card: 0 2px 12px rgba(0,0,0,0.08);
  --color-link: #4a90d9;
  --color-error: #f44336;
  --color-success: #2e7d32;
  --chart-grid: #ccc;
}

.dark {
  --bg-page: #121212;
  --bg-surface: #1e1e1e;
  --text-primary: #e0e0e0;
  --text-secondary: #aaa;
  --text-muted: #888;
  --text-label: #bbb;
  --border-input: #444;
  --shadow-card: 0 2px 12px rgba(0,0,0,0.4);
  --color-link: #6ab0f3;
  --color-error: #ef5350;
  --color-success: #66bb6a;
  --chart-grid: #444;
}
```

### Migration strategy

Each `.css` file replaces hardcoded colors with `var(--token)` references. No structural changes — just color value substitutions.

---

## 5. Component Migration

### 5.1 `App.css`

```
body { background: var(--bg-page); }
```

### 5.2 `Dashboard.css`

```
.dashboard { ... (structural, no change) }
.loading { color: var(--text-muted); }
```

### 5.3 `Header.css`

```
.header h1 { color: var(--text-primary); }
.author { color: var(--text-secondary); }
.last-updated { color: var(--text-muted); }
.logout-btn { color: var(--text-muted); }
.logout-btn:hover { color: var(--color-error); }
```

### 5.4 `ConnectionStatus.css`

```
.error-msg { color: var(--color-error); }
```

### 5.5 `CurrentIndicators.css`

```
.indicator-card { background: var(--bg-surface); box-shadow: var(--shadow-card); }
.indicator-label { color: var(--text-secondary); }
/* Color-coded values remain hardcoded (threshold-based, not theme-based) */
.temp-hot .indicator-value { color: #e74c3c; }   /* unchanged */
.temp-cold .indicator-value { color: #3498db; }   /* unchanged */
```

Threshold-based colors stay hardcoded — they signal measurement severity, not a UI theme.

### 5.6 `TemperatureChart.css` / `HumidityChart.css`

```
.chart-card { background: var(--bg-surface); box-shadow: var(--shadow-card); }
.chart-card h3 { color: var(--text-primary); }
```

### 5.7 `LoginPage.css` / `RegisterPage.css`

```
.login-page { background: var(--bg-page); }
.login-card { background: var(--bg-surface); box-shadow: var(--shadow-card); }
.login-title { color: var(--text-primary); }
.login-subtitle { color: var(--text-muted); }
.login-label { color: var(--text-label); }
.login-input { background: var(--bg-surface); border-color: var(--border-input); color: var(--text-primary); }
.login-error { color: var(--color-error); }
.login-submit { background: var(--text-primary); color: var(--bg-surface); }
.login-register-link a { color: var(--color-link); }
```

Same pattern applied to `RegisterPage.css`.

### 5.8 Charts — JSX prop changes

Chart colors (grid, axis, tooltip) are set via Recharts JSX props, not CSS. These need to be dynamic based on theme.

| Component | Current | Light | Dark |
|---|---|---|---|
| `CartesianGrid stroke` | `"#ccc"` | `"#ccc"` | `"#444"` |
| `XAxis` / `YAxis stroke` | black (default) | `"#666"` | `"#aaa"` |
| `Tooltip contentStyle` | white bg (default) | `{ background: '#fff' }` | `{ background: '#1e1e1e', border: '#444', color: '#e0e0e0' }` |

Line colors stay unchanged (`#ff6b6b` temperature, `#4ecdc4` humidity) — they are brand colors, not background-dependent.

The theme value is passed via a new `theme` prop on the chart components from `Dashboard`:

```typescript
// TemperatureChart.tsx
interface Props {
  measurements: Measurement[]
  theme: 'light' | 'dark'
}

export function TemperatureChart({ measurements, theme }: Props) {
  const isDark = theme === 'dark'
  // ...
  <CartesianGrid stroke={isDark ? '#444' : '#ccc'} />
  <XAxis stroke={isDark ? '#aaa' : '#666'} />
  <YAxis stroke={isDark ? '#aaa' : '#666'} />
  <Tooltip contentStyle={isDark ? { background: '#1e1e1e', border: '#444', color: '#e0e0e0' } : undefined} />
}
```

---

## 6. Theme Toggle Component

### `src/components/ThemeToggle/ThemeToggle.tsx`

A small, reusable button component:

```tsx
import { useTheme } from '../../contexts/ThemeContext'
import './ThemeToggle.css'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

### `src/components/ThemeToggle/ThemeToggle.css`

```css
.theme-toggle {
  background: none; border: none; font-size: 1.25rem;
  cursor: pointer; padding: 0.25rem; line-height: 1;
  border-radius: 6px; transition: background 0.15s;
}
.theme-toggle:hover { background: rgba(0,0,0,0.05); }
.dark .theme-toggle:hover { background: rgba(255,255,255,0.1); }
```

### Placement

| Page | Position |
|---|---|
| Login | Top-left corner of `login-card` (inside `.login-card`, before the title) |
| Register | Top-left corner of `register-card` (inside `.register-card`, before the title) |
| Dashboard | Header top-left corner (opposite of logout button) |

---

## 7. Data Flow

```
ThemeContext
  ├─ theme: 'light' | 'dark'
  └─ toggleTheme()
       ↓
App reads theme, passes to Layout pages
       ↓
Dashboard receives theme, passes to charts via props
  ├─ TemperatureChart(theme)
  └─ HumidityChart(theme)

ThemeToggle reads context directly (no prop drilling)
```

---

## 8. Route / Provider Wiring

### `main.tsx`

```typescript
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

`ThemeProvider` wraps `AuthProvider` — auth does not depend on theme, but both need to wrap `App`.

---

## 9. New Files

| File | Purpose |
|---|---|
| `src/contexts/ThemeContext.tsx` | `ThemeProvider` + `useTheme()` hook |
| `src/components/ThemeToggle/ThemeToggle.tsx` | Small button component (🌙/☀️) |
| `src/components/ThemeToggle/ThemeToggle.css` | Toggle button styles |
| `src/tests/ThemeContext.test.tsx` | Unit tests for context |

---

## 10. Modified Files

| File | Change |
|---|---|
| `src/main.tsx` | Wrap in `<ThemeProvider>` (outermost) |
| `src/App.css` | Add `:root` and `.dark` custom property blocks; replace `background` with `var(--bg-page)` |
| `src/components/Header/Header.tsx` | Add `<ThemeToggle />` to top-left of header |
| `src/components/Header/Header.css` | Add `.header-theme` positioning |
| `src/components/Dashboard/Dashboard.tsx` | Read theme from context, pass to chart components |
| `src/components/TemperatureChart/TemperatureChart.tsx` | Accept `theme` prop, use dynamic Recharts colors |
| `src/components/HumidityChart/HumidityChart.tsx` | Accept `theme` prop, use dynamic Recharts colors |
| `src/components/LoginPage/LoginPage.tsx` | Add `<ThemeToggle />` inside `.login-card` (top-left) |
| `src/components/LoginPage/LoginPage.css` | Replace colors with `var(--token)`; add toggle positioning |
| `src/components/RegisterPage/RegisterPage.tsx` | Add `<ThemeToggle />` inside `.register-card` (top-left) |
| `src/components/RegisterPage/RegisterPage.css` | Replace colors with `var(--token)`; add toggle positioning |
| `src/components/Dashboard/Dashboard.css` | Replace `color: #888` with `var(--text-muted)` |
| `src/components/ConnectionStatus/ConnectionStatus.css` | Replace `#f44336` with `var(--color-error)` |
| `src/components/CurrentIndicators/CurrentIndicators.css` | Replace surface/box-shadow with vars; keep threshold colors hardcoded |
| `src/components/TemperatureChart/TemperatureChart.css` | Replace card bg/shadow with `var(--...)` |
| `src/components/HumidityChart/HumidityChart.css` | Replace card bg/shadow with `var(--...)` |
| `src/tests/test-utils.tsx` | Add `ThemeProvider` wrapper |

### CSS files with NO changes

| File | Reason |
|---|---|
| `ProtectedRoute.tsx` | No CSS file — no presentational styles |
| `Chart line colors` | Brand colors (`#ff6b6b`, `#4ecdc4`) — not background-dependent |

---

## 11. Phased Implementation Plan

### Phase 1 — Foundation (no visual changes)

| Step | File | Description |
|---|---|---|
| 1 | `src/contexts/ThemeContext.tsx` | Create `ThemeProvider` + `useTheme()`: state, localStorage, body class toggle |
| 2 | `src/App.css` | Add `:root` and `.dark` custom property blocks |
| 3 | `src/main.tsx` | Wrap app in `<ThemeProvider>` |
| 4 | `src/tests/test-utils.tsx` | Add `ThemeProvider` to `renderWithProviders` |

**Verification**: `npm run build` passes. No visual changes — `theme` defaults to `'light'` which matches the current `:root` palette.

### Phase 2 — CSS Migration

| Step | File | Description |
|---|---|---|
| 5 | `src/App.css` | `body { background: var(--bg-page) }` |
| 6 | `src/components/Header/Header.css` | Replace colors with `var(--...)` |
| 7 | `src/components/ConnectionStatus/ConnectionStatus.css` | Replace `#f44336` with `var(--color-error)` |
| 8 | `src/components/CurrentIndicators/CurrentIndicators.css` | Replace bg/shadow, keep threshold colors |
| 9 | `src/components/TemperatureChart/TemperatureChart.css` | Replace colors with `var(--...)` |
| 10 | `src/components/HumidityChart/HumidityChart.css` | Replace colors with `var(--...)` |
| 11 | `src/components/Dashboard/Dashboard.css` | Replace `#888` with `var(--text-muted)` |
| 12 | `src/components/LoginPage/LoginPage.css` | Replace all colors with `var(--...)` |
| 13 | `src/components/RegisterPage/RegisterPage.css` | Replace all colors with `var(--...)` |

**Verification**: `npm run build` passes. Visual appearance identical to before (light mode).

### Phase 3 — Toggle Component

| Step | File | Description |
|---|---|---|
| 14 | `src/components/ThemeToggle/ThemeToggle.tsx` | Create button component with 🌙/☀️ |
| 15 | `src/components/ThemeToggle/ThemeToggle.css` | Toggle button styles |
| 16 | `src/components/Header/Header.tsx` | Add `<ThemeToggle />` top-left |
| 17 | `src/components/Header/Header.css` | `.header-theme` positioning styles |
| 18 | `src/components/LoginPage/LoginPage.tsx` | Add `<ThemeToggle />` inside card |
| 19 | `src/components/RegisterPage/RegisterPage.tsx` | Add `<ThemeToggle />` inside card |

**Verification**: Theme toggle appears on all pages. Clicking switches between light/dark.

### Phase 4 — Chart Adaptation

| Step | File | Description |
|---|---|---|
| 20 | `src/components/Dashboard/Dashboard.tsx` | Read theme from context, pass `theme` prop to charts |
| 21 | `src/components/TemperatureChart/TemperatureChart.tsx` | Accept `theme` prop, dynamic grid/axis/tooltip colors |
| 22 | `src/components/HumidityChart/HumidityChart.tsx` | Accept `theme` prop, dynamic grid/axis/tooltip colors |

**Verification**: Charts adapt grid, axis, and tooltip to dark mode correctly.

### Phase 5 — Tests

| Step | File | Description |
|---|---|---|
| 23 | `src/tests/ThemeContext.test.tsx` | Test initial state, toggle, localStorage persistence, body class |
| 24 | `src/tests/ThemeToggle.test.tsx` | Test render, click toggles icon |
| 25 | Update `src/tests/LoginPage.test.tsx` | Verify toggle renders in login |
| 26 | Update `src/tests/Header.test.tsx` | Verify toggle renders in header |

---

## 12. Risks and Edge Cases

| Risk | Severity | Mitigation |
|---|---|---|
| **CSS custom properties unsupported** | None | Target `es2023` + modern browsers. No IE support needed |
| **Body class flash on load** | Low | `ThemeContext` reads localStorage synchronously in `useState` initializer — class applied before first paint |
| **Chart flickers on theme switch** | Low | Recharts re-renders when props change — theme change triggers re-render with new colors instantly |
| **Toggle hidden in certain views** | Low | Toggle is present in Login, Register, and Dashboard — the three routes the user ever sees |
| **Accessibility — missing label** | Low | `aria-label="Toggle theme"` on the button |
| **LocalStorage cleared mid-session** | Low | Falls back to `'light'` default — no crash, just reset to light mode |
| **CSS custom property fallback** | Medium | Every `var(--token)` should have a hardcoded fallback for safety: `var(--bg-page, #f0f2f5)` (though not strictly necessary since `:root` always defines them) |
