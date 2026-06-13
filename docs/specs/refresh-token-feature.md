# Refresh Token Feature Specification

## 1. Problem Statement

The current auth system stores a single `access_token` in localStorage. When the token expires, the next API call returns `401`, which triggers token removal and a redirect to `/login` — forcing the user to re-authenticate. This is disruptive mid-session.

The backend exposes `POST /api/refresh` which accepts a **refresh token** (a long-lived JWT with `type: "refresh"`) in the `Authorization: Bearer` header and returns a new `{ access_token }`.

---

## 2. Current Architecture (no changes)

### Auth storage (localStorage)

| Key | Value | Purpose |
|---|---|---|
| `auth_token` | `access_token` JWT (short-lived) | Attached as `Authorization: Bearer` on every API call |

### AuthContext state

```
token: string | null          ← from localStorage('auth_token')
isAuthenticated: boolean       ← token !== null
isLoading: boolean             ← true during login() API call
login(username, password)      ← POST /api/login → { access_token }, stores token
logout()                       ← localStorage.removeItem('auth_token'), setToken(null)
```

### API layer (api.ts)

```
apiRequest<T>(path, options?)
  → reads token from localStorage('auth_token')
  → attaches Authorization: Bearer header
  → on 401: localStorage.removeItem('auth_token'), window.location.href = '/login'
  → on non-ok: parse JSON body for error message, throw
```

---

## 3. Proposed Changes

### 3.1 Storage additions

| Key | Value | When set | When cleared |
|---|---|---|---|
| `auth_token` | access_token JWT (existing) | On login, on successful refresh | On logout, on failed refresh |
| `refresh_token` | refresh_token JWT **(new)** | On login | On logout, on failed refresh |

### 3.2 Login response change

The backend `POST /api/login` response must now include both tokens:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

The `AuthContext.login()` stores **both** tokens in localStorage and state.

### 3.3 AuthContext state additions

```typescript
interface AuthContextValue {
  token: string | null           // access_token (unchanged)
  refreshToken: string | null    // refresh_token (NEW)
  isAuthenticated: boolean       // token !== null (unchanged)
  isLoading: boolean             // unchanged
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}
```

### 3.4 401 interceptor with refresh (critical change)

`apiRequest` in `api.ts` changes behaviour on `401`:

```
1. Original request gets 401
2. Store the failed request (path + options) for retry
3. Attempt POST /api/refresh with Authorization: Bearer <refresh_token>
4a. If refresh succeeds (200):
    - Store new access_token from response
    - Retry the original request with the new token
    - Return the retry result
4b. If refresh fails (any error):
    - Clear both tokens from localStorage
    - Redirect to /login
    - Throw
```

#### Race condition: concurrent 401s

Multiple in-flight requests may all get 401 simultaneously. To avoid N concurrent refresh attempts:

- Use a **promise queue** pattern — a module-level `refreshingPromise: Promise<string> | null`
- When the first 401 triggers a refresh, subsequent 401s wait for the same promise
- Once resolved, all queued requests retry with the new token

Pseudocode:

```typescript
let refreshingPromise: Promise<string> | null = null

// Inside apiRequest, on 401:
if (response.status === 401) {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    clearTokensAndRedirect()
    throw new Error('Session expired')
  }

  if (!refreshingPromise) {
    refreshingPromise = attemptRefresh(refreshToken)
      .finally(() => { refreshingPromise = null })
  }

  const newToken = await refreshingPromise
  // Retry original request with newToken
  return apiRequest<T>(path, options)  // recursive retry
}
```

### 3.5 `attemptRefresh` function

New exported (or internal) function in `api.ts`:

```typescript
async function attemptRefresh(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
    throw new Error('Session expired — refresh failed')
  }

  const data = await response.json()
  localStorage.setItem('auth_token', data.access_token)
  return data.access_token
}
```

### 3.6 AuthContext changes

#### `login()` — store both tokens

```typescript
const login = useCallback(async (username: string, password: string) => {
  setIsLoading(true)
  try {
    const response = await loginUser(username, password)
    localStorage.setItem('auth_token', response.access_token)
    localStorage.setItem('refresh_token', response.refresh_token)  // NEW
    setToken(response.access_token)
  } finally {
    setIsLoading(false)
  }
}, [])
```

#### `logout()` — clear both tokens

```typescript
const logout = useCallback(() => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')  // NEW
  setToken(null)
}, [])
```

### 3.7 Token storage: why localStorage

| Option | Rejected because |
|---|---|
| **httpOnly cookie** | Cannot be set from a SPA; requires backend cooperation |
| **sessionStorage** | Lost on tab close; refresh token outlives tab |
| **In-memory** | Lost on page refresh; defeats the purpose of refresh tokens |
| **localStorage** | Chosen — pragmatic for this SPA; CSP headers mitigate XSS risk |

---

## 4. Files to modify

| File | Change |
|---|---|
| `src/services/api.ts` | Add `attemptRefresh()`, `refreshingPromise` queue, 401 retry logic. Export `refreshToken` for tests |
| `src/contexts/AuthContext.tsx` | Add `refreshToken` state, store/clear both tokens in `login()`/`logout()` |
| `src/tests/AuthContext.test.tsx` | Update tests to verify both tokens are stored/cleared |
| `src/tests/api.test.ts` | **New file** — test 401 → refresh flow, race condition, failed refresh |

---

## 5. New file

| File | Purpose |
|---|---|
| `src/tests/api.test.ts` | Unit tests for `apiRequest` with mocked `fetch` |

---

## 6. Data flow diagrams

### Login

```
LoginPage form submit
  → login(username, password) [AuthContext]
    → loginUser() [api.ts]
      → POST /api/login  { username, password }
      ← { access_token, refresh_token }  ← REFRESH TOKEN ADDED
    → localStorage.setItem('auth_token', access_token)
    → localStorage.setItem('refresh_token', refresh_token)  ← NEW
    → setState({ token, refreshToken, isAuthenticated: true })
  → navigate('/dashboard')
```

### Expired token — successful refresh

```
apiRequest('/measurements/latest')
  → GET → 401
  → POST /api/refresh  Authorization: Bearer <refresh_token>
  ← { access_token: "eyJ..." }
  → Store new access_token in localStorage
  → Retry GET /measurements/latest  Authorization: Bearer <new_token>
  ← Measurement[]
  → Return data to caller (transparent)
```

### Expired token — failed refresh (both tokens stale)

```
apiRequest('/measurements/latest')
  → GET → 401
  → POST /api/refresh  Authorization: Bearer <refresh_token>
  → 401 (or any error)
  → localStorage.removeItem('auth_token')
  → localStorage.removeItem('refresh_token')
  → window.location.href = '/login'
  → throw 'Session expired'
```

### Race condition (3 concurrent requests, all expired)

```
Time →
├─ Request A → 401
│  └─ refreshingPromise === null → start refresh
│     └─ refreshingPromise = attemptRefresh()
├─ Request B → 401
│  └─ refreshingPromise !== null → await refreshingPromise
├─ Request C → 401
│  └─ refreshingPromise !== null → await refreshingPromise
│
└─ Refresh succeeds → refreshingPromise = null
   ├─ Request A retries → 200 ✓
   ├─ Request B retries → 200 ✓
   └─ Request C retries → 200 ✓
```

---

## 7. Backend expectations

The refresh endpoint must:

| Property | Expected |
|---|---|
| Method | `POST` |
| Path | `/api/refresh` |
| Auth header | `Authorization: Bearer <refresh_token_jwt>` |
| Success response (200) | `{ "access_token": "eyJ..." }` |
| Error response (401) | Token expired, invalid, or blacklisted |
| Body | Empty (token in header only) |
| CORS | Same as existing endpoints (already configured) |

### Refresh token JWT shape (observed)

```json
{
  "fresh": false,
  "iat": 1781304207,
  "jti": "3a31c791-52b6-4ced-b76b-1c1880ab1701",
  "type": "refresh",
  "sub": "ruben",
  "nbf": 1781304207,
  "csrf": "4e955245-791b-473f-9e1d-1b601986bcd8",
  "exp": 1783896207
}
```

### Login endpoint change

The login response must be updated to return `refresh_token` alongside `access_token`:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

This is a backend change — coordinate with the backend team.

---

## 8. Risks and edge cases

| Risk | Severity | Mitigation |
|---|---|---|
| **Refresh endpoint returns 401** | High | Falls through to existing "clear tokens → redirect to login" — same UX as today |
| **No refresh_token in localStorage** | High | If user logged in before this feature, they have no refresh_token. First 401 will go directly to login |
| **Race condition: refresh in progress** | Medium | `refreshingPromise` queue — only one refresh at a time |
| **Refresh succeeds but retry fails** | Low | Retry failure will surface as a normal API error (not 401) to the caller. Next poll will retry with the new token |
| **Concurrent refresh fails for retried request B** | Low | Once `refreshingPromise` rejects, all queued requests will throw. This is correct — the session is dead |
| **Tab hidden during refresh** | Low | The refresh fetch will complete in background. No user-facing impact |
| **Double form submit on login** | Low | Already handled — button disabled while isLoading=true |
| **StrictMode double-mount** | Low | `refreshingPromise` is module-level, not in React state. Double-mount does not affect it |
| **Backend returns refresh_token only on login** | Low | Login flow is the only place to obtain a refresh_token. If the session is lost, user re-authenticates |

---

## 9. Backward compatibility

- Users with `auth_token` in localStorage but no `refresh_token` will get the existing behaviour on first 401 (redirect to login)
- No changes to `ProtectedRoute`, `LoginPage`, `Header` component props or `Dashboard`
- No changes to route structure, `nginx.conf`, Dockerfile, or build config
- The `apiRequest` function signature remains identical — all changes are internal

---

## 10. Testing plan

### api.test.ts (new)

| Test | Scenario |
|---|---|
| 401 triggers refresh attempt | Mock fetch returns 401, then refresh succeeds, then original request succeeds |
| Successful refresh retries original request | Verify the retried request uses the new token from localStorage |
| Failed refresh clears tokens and redirects | Mock refresh returns 401, verify tokens cleared and `window.location.href` set |
| No refresh_token on 401 redirects to login | localStorage has no refresh_token, verify direct redirect |
| Refresh promise queue prevents concurrent refreshes | Trigger 3 parallel 401 requests, verify only 1 refresh call made |
| Non-401 errors pass through unchanged | 500 error is thrown as-is without refresh attempt |

### AuthContext.test.tsx updates

| Test | Scenario |
|---|---|
| Login stores both tokens | After `login()`, check localStorage for `auth_token` and `refresh_token` |
| Logout clears both tokens | After `logout()`, check localStorage for both keys removed |
| Refresh token is accessible via context | `TestConsumer` can read `refreshToken` from context |

---

## 11. Implementation order

| Phase | Steps | Files | Verification |
|---|---|---|---|
| **1. API layer** | Add `attemptRefresh()`, `refreshingPromise`, 401 retry logic | `api.ts` | `npm run build` passes |
| **2. AuthContext** | Add `refreshToken` state, update `login()`/`logout()` to handle both tokens | `AuthContext.tsx` | `npm run build` passes |
| **3. Tests** | New `api.test.ts`, update `AuthContext.test.tsx` | `src/tests/` | `npm run test` passes |

---

## 12. Rollback plan

If the refresh endpoint is not ready or behaves unexpectedly:

1. Revert `api.ts` to the original 401 handler (immediate redirect)
2. Revert `AuthContext.tsx` to single-token state
3. The app falls back to the current behaviour with no user-facing impact

The granular commits from the phased approach make selective revert straightforward.
