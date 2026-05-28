# Authentication Feature Specification

## 1. Current Architecture Analysis

**Current state**: Single-page React 19 + TypeScript app. **No router**, **no Context API**, **no state library**. Data flows unidirectionally: `api.ts` → `useWeatherData` (polling every 5s) → `Dashboard` → child components via props.

| Layer | Current | Auth Impact |
|---|---|---|
| Routing | `App.tsx` renders `<Dashboard />` unconditionally | Must introduce `react-router-dom` for conditional Login vs Dashboard rendering |
| State management | `useState`/`useEffect` in one custom hook | Auth state is cross-cutting (needed by Router and API layer) — justifies introducing the first Context in the app |
| API client | Bare `fetch()` with no auth headers | Every request must carry `Authorization: Bearer <token>` |
| API base | Hardcoded `http://13.223.175.101:5000/api` in `api.ts:3` | Will be extracted into `VITE_API_BASE` env var |
| Nginx | Proxies `/api/` to backend (`nginx.conf:13`) | Login requests flow through the same proxy — no config change needed |
| Dependencies | react, react-dom, recharts, date-fns, test libs | One addition: `react-router-dom` |

---

## 2. Decisions (from stakeholder)

| Decision | Chosen Option | Rationale |
|---|---|---|
| **Login response shape** | `{ "access_token": "..." }` | Backend returns field named `access_token` |
| **Token expiry** | Has expiry, no refresh endpoint | Must handle 401 globally and redirect to login |
| **Logout** | Local only (clear token, no backend call) | Simplest approach; no backend endpoint needed |
| **API base URL** | `VITE_API_BASE` environment variable | Configurable per environment; default to `http://13.223.175.101:5000/api` |
| **Nginx routing** | Login goes through existing `/api/` proxy | No changes to `nginx.conf` |
| **Logout button** | Top-right corner of the header | Visible but unobtrusive; reuses existing header layout |

---

## 3. Token Persistence Strategy

| Operation | Implementation |
|---|---|
| **Store on login** | `localStorage.setItem('auth_token', access_token)` |
| **Read on load** | `localStorage.getItem('auth_token')` in `AuthProvider` initial state |
| **Remove on logout** | `localStorage.removeItem('auth_token')` + clear context state |
| **Send on requests** | Read from localStorage in the API wrapper; set `Authorization: Bearer <token>` header |
| **Handle expiry** | 401 interceptor in API wrapper → clear token → navigate to `/login` |

No refresh token — on expiry the user re-authenticates.

---

## 4. Auth Architecture

```
AuthProvider (contexts/AuthContext.tsx)
  └─ holds token, isAuthenticated, isLoading
  └─ exposes login(), logout()
  └─ initializes from localStorage

Router (App.tsx)
  ├─ /            → redirect to /dashboard or /login
  ├─ /login       → LoginPage (public)
  ├─ /dashboard   → ProtectedRoute → Dashboard (protected)
  └─ *            → redirect to /

apiRequest (services/api.ts)
  ├─ reads token from localStorage
  ├─ attaches Authorization header
  ├─ handles 401 → clears token → navigates to /login
  └─ all endpoints (loginUser, fetchLatestMeasurements) use this wrapper
```

---

## 5. Component Tree

```
main.tsx
  └─ BrowserRouter
       └─ AuthProvider
            └─ App.tsx
                 └─ Routes
                      ├─ /login → LoginPage
                      └─ /dashboard → ProtectedRoute
                                           └─ Dashboard
                                                ├─ Header
                                                │    └─ logout button (top-right)
                                                ├─ ConnectionStatus
                                                ├─ CurrentIndicators
                                                ├─ TemperatureChart
                                                └─ HumidityChart
```

---

## 6. Data Flows

### Login flow

```
LoginPage form submit
  → login(username, password) [AuthContext]
    → loginUser() [api.ts]
      → POST /api/login  { username, password }
      ← { access_token: "..." }
    → localStorage.setItem('auth_token', access_token)
    → setState({ token, isAuthenticated: true })
  → navigate('/dashboard')
```

### Authenticated request flow

```
useWeatherData poll
  → fetchLatestMeasurements() [api.ts]
    → apiRequest('/measurements/latest')
      → reads token from localStorage
      → GET /api/measurements/latest  Authorization: Bearer <token>
      ← Measurement[]
    ← data
```

### Expired token flow

```
apiRequest('/measurements/latest')
  → GET → 401
  → localStorage.removeItem('auth_token')
  → window.location.href = '/login'
```

---

## 7. API Layer Changes

### Current (`src/services/api.ts`)

```typescript
const API_BASE = 'http://13.223.175.101:5000/api'

export async function fetchLatestMeasurements(): Promise<Measurement[]> {
  const response = await fetch(`${API_BASE}/measurements/latest`)
  if (!response.ok) throw new Error('Failed to fetch measurements')
  return response.json()
}
```

### Proposed

```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://13.223.175.101:5000/api'

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchLatestMeasurements(): Promise<Measurement[]> {
  return apiRequest<Measurement[]>('/measurements/latest')
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
```

---

## 8. New Files

| File | Purpose |
|---|---|
| `src/contexts/AuthContext.tsx` | `AuthProvider` component + `useAuth()` hook |
| `src/components/LoginPage.tsx` | Login form with validation + inline error |
| `src/components/LoginPage.css` | Login page styling (centered card, form, error) |
| `src/components/ProtectedRoute.tsx` | Route guard — redirects to `/login` if unauthenticated |
| `src/tests/AuthContext.test.tsx` | Auth context unit tests |
| `src/tests/LoginPage.test.tsx` | Login page render + interaction tests |
| `src/tests/ProtectedRoute.test.tsx` | Route guard redirect tests |
| `.env` | `VITE_API_BASE=http://127.0.0.1:5000/api` |

---

## 9. Modified Files

| File | Change |
|---|---|
| `package.json` | Add `react-router-dom@^7` to `dependencies` |
| `src/main.tsx` | Wrap `<App />` inside `<BrowserRouter>` and `<AuthProvider>` |
| `src/App.tsx` | Replace unconditional `<Dashboard />` with `<Routes>` |
| `src/services/api.ts` | Add `apiRequest` wrapper, `loginUser`, extract `VITE_API_BASE`, retrofit `fetchLatestMeasurements` |
| `src/components/Header.tsx` | Add logout button (top-right corner) |
| `src/components/Dashboard.css` | Minor additions for logout button positioning |
| `AGENTS.md` | Update architecture section to reflect router + auth |
| `README.md` | Add authentication info |

---

## 10. LoginPage Specifications

### Layout

Centered card on `#f0f2f5` background, matching existing card design (white background, 12px border-radius, `0 2px 12px rgba(0,0,0,0.08)` shadow).

### Form fields

- **Username**: text input, `required`, `minLength=1`
- **Password**: password input, `required`, `minLength=1`

### Validation

- **Client-side**: both fields required (HTML `<input required />` + native validation)
- **Server-side**: catch error from `loginUser()`, display inline below the submit button

### States

| State | Behavior |
|---|---|
| **Idle** | Empty form, submit button enabled |
| **Submitting** | Button disabled, shows "Signing in..." text |
| **Error (invalid credentials)** | Inline error in red (matching `error-msg` style), form remains filled, button re-enabled |
| **Success** | Navigate to `/dashboard` |

### Error display

A single `<p className="login-error">` element below the submit button, showing the error message from the API response. Uses emoji prefix `⚠️` for consistency with existing `Dashboard.tsx:27`.

### Post-login redirect

- After successful login: `navigate('/dashboard')`
- If user navigates to `/login` while already authenticated: redirect immediately to `/dashboard`

### Styling

`LoginPage.css` follows existing conventions — kebab-case class names, global CSS, responsive at 768px.

---

## 11. ProtectedRoute Specifications

```typescript
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <p className="loading">Verifying session...</p>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
```

- Uses `isLoading` to prevent flash of login page while token is being read from localStorage on initial mount.
- Since localStorage reads are synchronous, `isLoading` is effectively instant — the guard exists for correctness and future-proofing (e.g., if an async token validation call is added later).
- `<Navigate to="/login" replace />` prevents back-button from returning to the protected route.

---

## 12. AuthContext Specifications

### Context value shape

```typescript
interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}
```

### Initial state

```typescript
const [token, setToken] = useState<string | null>(
  () => localStorage.getItem('auth_token')
)
// isAuthenticated = token !== null
// isLoading = false (synchronous initialization; set true only during login request)
```

### `login(username, password)`

1. Sets `isLoading = true`
2. Calls `loginUser(username, password)` from `api.ts`
3. On success: stores `access_token` in localStorage, sets token state, sets `isLoading = false`
4. On error: sets `isLoading = false`, **re-throws the error** (caught by `LoginPage` for inline display)

### `logout()`

1. `localStorage.removeItem('auth_token')`
2. `setToken(null)`

The calling component handles navigation (e.g., `navigate('/login')` after calling `logout()`).

### `isLoading` usage

- `false` initially (no async startup work)
- `true` during the `login()` API call (used by `LoginPage` to disable the submit button)
- Could also be used for an optional token-validation-on-load call if added later

---

## 13. Routing Specification

### `App.tsx`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './components/Dashboard'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

### `main.tsx`

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

---

## 14. Logout Button (Header Change)

### Addition to `Header.tsx`

```tsx
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

// Inside the component body
const { logout } = useAuth()
const navigate = useNavigate()

const handleLogout = () => {
  logout()
  navigate('/login')
}

// Inside the JSX header, add:
<div className="header-logout">
  <button onClick={handleLogout} className="logout-btn">Logout</button>
</div>
```

### Additions to `Dashboard.css`

```css
.header { position: relative; }
.header-logout { position: absolute; top: 0; right: 0; }
.logout-btn {
  background: none; border: none; color: #888;
  cursor: pointer; font-size: 0.85rem; padding: 0.25rem 0.5rem;
}
.logout-btn:hover { color: #e74c3c; text-decoration: underline; }
```

---

## 15. Phased Implementation Plan

### Phase 1 — Foundation (no visual changes)

| Step | File | Description |
|---|---|---|
| 1 | `package.json` | Add `react-router-dom@^7` to `dependencies` |
| 2 | `src/contexts/AuthContext.tsx` | Create `AuthProvider`, `useAuth()` hook: token state initialized from `localStorage`, `login()`, `logout()` |
| 3 | `src/services/api.ts` | Add `apiRequest<T>()` wrapper with token injection, 401 handler; add `loginUser()`; retrofit `fetchLatestMeasurements` |
| 4 | `src/main.tsx` | Wrap `<App />` in `<BrowserRouter>` `<AuthProvider>` |
| 5 | `.env` | Create with `VITE_API_BASE=http://127.0.0.1:5000/api` |

**Verification**: `npm run build` passes (no visual changes yet).

### Phase 2 — Routing & Protection

| Step | File | Description |
|---|---|---|
| 6 | `src/components/ProtectedRoute.tsx` | Create route guard component |
| 7 | `src/App.tsx` | Rewrite with `<Routes>`: `/`, `/login`, `/dashboard` (protected), `*` catch-all |

**Verification**: Navigating to `/dashboard` when unauthenticated redirects to `/login`.

### Phase 3 — Login UI

| Step | File | Description |
|---|---|---|
| 8 | `src/components/LoginPage.tsx` | Login form with username + password fields, client-side validation, submit handler, inline error display |
| 9 | `src/components/LoginPage.css` | Centered card layout, form inputs, error message styles, responsive breakpoint |

**Verification**: Full login flow works — invalid creds show inline error, valid creds navigate to `/dashboard`.

### Phase 4 — Logout

| Step | File | Description |
|---|---|---|
| 10 | `src/components/Header.tsx` | Add logout button top-right, import `useAuth` + `useNavigate` |
| 11 | `src/components/Dashboard.css` | Add `.header-logout` and `.logout-btn` styles |

**Verification**: Full auth lifecycle complete — login → view dashboard → logout → redirected to login.

### Phase 5 — Polish

| Step | Files | Description |
|---|---|---|
| 12 | `AGENTS.md` | Update architecture to mention router, auth context, protected routes |
| 13 | `README.md` | Add authentication section with login instructions |

### Phase 6 — Tests

| Step | File | Description |
|---|---|---|
| 14 | `src/tests/AuthContext.test.tsx` | Test initial state from localStorage, `login()` success/failure, `logout()` |
| 15 | `src/tests/LoginPage.test.tsx` | Test render, validation, inline error, successful login redirect |
| 16 | `src/tests/ProtectedRoute.test.tsx` | Test redirect when unauthenticated, render `<Outlet />` when authenticated |
| 17 | `src/tests/api.test.ts` | Test token attachment, 401 handling, loginUser |

---

## 16. Risks and Edge Cases

| Risk | Severity | Mitigation |
|---|---|---|
| **Token expires mid-session** | High | 401 interceptor in `apiRequest` → clears token → redirects to `/login`. User re-authenticates. Max 5s delay before next poll triggers discovery |
| **Page refresh shows login page momentarily** | Medium | `AuthProvider` reads token from localStorage **synchronously** in `useState` initializer. No async call means no flash. `ProtectedRoute`'s `isLoading` guard is instant |
| **Stale token on page load (already expired)** | Medium | First 401 from `/api/measurements/latest` poll triggers redirect to `/login`. Worst case: ~5s delay before the fetch fires |
| **XSS — token in localStorage** | Medium | No user-generated content rendered in this app. Token is only sent as an HTTP header. CSP headers in production Nginx config provide defense-in-depth |
| **Double form submission (user clicks twice)** | Low | Submit button disabled while `isLoading === true` (during the login API call) |
| **StrictMode double-fires effects** | Low | React 19 StrictMode fires effects twice in dev. `AuthProvider` has no effects with side effects (no setInterval, no subscription) — only the `login()` function which is called by user action |
| **Login page shown to already-authenticated user** | Low | `LoginPage` reads `useAuth()` and redirects to `/dashboard` if `isAuthenticated` is true |
| **Backend returns non-JSON error (e.g., HTML 502)** | Low | `apiRequest` uses `response.json().catch(() => null)` to safely attempt parsing, then constructs a readable error |
| **Token storage race condition** | None | `localStorage` operations are synchronous; React state updates are batched within the same microtask |
| **Browser back after logout** | None | React Router navigates are client-side only. Protected route will re-check auth state and redirect |

---

## 17. Dependencies Impact

```
Current deps:     react, react-dom, recharts, date-fns, @testing-library/*, jsdom, vitest
Added deps:       react-router-dom@^7

Bundle size:      ~14KB gzipped additional
TypeScript types: Included with react-router-dom (no @types/ package needed)
Build config:     No changes needed (Vite handles react-router-dom natively)
Nginx/Docker:     No changes needed (login goes through existing /api/ proxy)
```

---

## 18. Nginx Proxy Coverage

The existing `nginx.conf` proxies `/api/` to the backend:

```nginx
location /api/ {
    proxy_pass http://192.168.20.167:5000/api/;
}
```

Both the login request (`POST /api/login`) and the measurement poll (`GET /api/measurements/latest`) flow through this same rule. **No `nginx.conf` changes needed.**

---

## 19. Environment Configuration

New `.env` file at project root:

```
VITE_API_BASE=http://127.0.0.1:5000/api
```

Default fallback in `api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://13.223.175.101:5000/api'
```

For production Docker builds, the `VITE_API_BASE` value is baked into the static bundle at build time (Vite's behavior with `import.meta.env`). To change the API address in production, either:
1. Rebuild the Docker image with a different build arg
2. Use the nginx proxy override (existing `nginx.conf` behavior)
