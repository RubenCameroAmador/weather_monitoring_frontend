# User Registration Feature Specification

## 1. Current Architecture Analysis

**Current state**: Authentication is fully implemented — `AuthContext` manages token state (access + refresh), `api.ts` provides `loginUser()` with automatic refresh, `LoginPage` renders a centered form, and `ProtectedRoute` guards `/dashboard`.

Relevant files:

| File | Purpose |
|---|---|
| `src/contexts/AuthContext.tsx` | `AuthProvider` + `useAuth()` — token state, `login()`, `logout()` |
| `src/services/api.ts` | `loginUser()`, `apiRequest<T>()` wrapper with 401 retry + refresh |
| `src/components/LoginPage/LoginPage.tsx` | Login form with validation + error display |
| `src/components/LoginPage/LoginPage.css` | Centered card, form inputs, error styles |
| `src/types/Measurement.ts` | Shared type file (no auth types exist) |

**Registration gap**: No registration UI, no API function, no route, no link from the login page.

---

## 2. Backend Contract

### Endpoint

```
POST /api/users
Content-Type: application/json

{
  "username": "ruben",
  "password": "1234"
}
```

### Success Response

```
Status: 201 Created
{
  "id": 1,
  "username": "ruben"
}
```

The backend **does not** return a token on registration — the user must log in after registering.

### Error Responses

| Status | Body | Meaning |
|---|---|---|
| `409 Conflict` | `{ "message": "Username already taken" }` | Duplicate username |
| `422 Unprocessable` | `{ "message": "Validation error" }` | Missing/invalid fields |
| `500` | — | Server error |

---

## 3. Decisions (proposed)

| Decision | Chosen Option | Rationale |
|---|---|---|
| **Registration returns no token** | User must log in after registering | Follows the backend contract — no token in response |
| **Post-registration UX** | Show success message + link to login page | No auto-redirect; user sees confirmation before proceeding |
| **Validation** | Client-side: both fields required, password min 4 chars | Catches obvious errors before a network call |
| **API response shape** | `registerUser()` returns a generic success type | Backend returns `{ id, username }` — not a full user object |
| **Registration route** | `/register` | Parallel to `/login`, both public |
| **Link on login page** | "¿No tienes cuenta? Regístrate" below the form | Standard pattern; matches Latin American Spanish of the target users |

---

## 4. New Files

| File | Purpose |
|---|---|
| `src/components/RegisterPage/RegisterPage.tsx` | Registration form with username, password, confirm password |
| `src/components/RegisterPage/RegisterPage.css` | Styling — shares login card layout (same background, shadow, radius) |
| `src/tests/RegisterPage.test.tsx` | Unit tests for the registration page |

---

## 5. Modified Files

| File | Change |
|---|---|
| `src/services/api.ts` | Add `registerUser(username, password)` function using `POST /api/users` |
| `src/components/LoginPage/LoginPage.tsx` | Add "¿No tienes cuenta? Regístrate" link below the submit button |
| `src/components/LoginPage/LoginPage.css` | Add `.login-register-link` style for the registration prompt |
| `src/App.tsx` | Add `/register` route (public, no `ProtectedRoute`) |
| `AGENTS.md` | Add register route to architecture description |

---

## 6. API Layer Changes

### Add to `src/services/api.ts`

```typescript
export async function registerUser(
  username: string,
  password: string,
): Promise<{ id: number; username: string }> {
  return apiRequest<{ id: number; username: string }>('/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
```

- Uses the existing `apiRequest<T>()` wrapper (no auth token needed — this is a public endpoint).
- Returns `{ id, username }` on success.
- Throws on error (409 → "Username already taken", etc.) — caught by `RegisterPage` for inline display.

---

## 7. RegisterPage Specifications

### Layout

Identical to `LoginPage` — centered white card on `#f0f2f5` background, 12px border-radius, `0 2px 12px rgba(0,0,0,0.08)` shadow.

### Form fields

| Field | Type | Validation |
|---|---|---|
| **Username** | text, `autoFocus` | `required`, `minLength=1` |
| **Password** | password | `required`, `minLength=4` |
| **Confirm password** | password | `required`, must match Password |

### States

| State | Behavior |
|---|---|
| **Idle** | Empty form, submit button enabled |
| **Submitting** | Button disabled, shows "Creating account..." |
| **Error (validation)** | Inline error below confirm-password field — form remains filled |
| **Error (duplicate username)** | Inline error below submit button — `⚠️ Username already taken` |
| **Error (server)** | Inline error below submit button — `⚠️ Registration failed` |
| **Success** | Form replaced with success message: "✅ Account created! You can now sign in." + link to `/login` |

### Error and success display

- **Inline errors**: `<p className="register-error">⚠️ {message}</p>` (red, matching `login-error`)
- **Success**: `<p className="register-success">✅ Account created! You can now <Link to="/login">sign in</Link>.</p>` (green, `#2e7d32`)

### Post-registration

- Show success message — do **not** auto-redirect
- User clicks "sign in" link to go to `/login`

### Redirect if already authenticated

Just like `LoginPage`, if `isAuthenticated` is true, `RegisterPage` redirects to `/dashboard` via `<Navigate to="/dashboard" replace />`.

---

## 8. LoginPage Changes

### Add link below the submit button

```tsx
{/* After the submit button (inside the form or just after the form) */}
<p className="login-register-link">
  ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
</p>
```

### Position

Rendered outside the `.login-form` div, inside `.login-card`, after the closing `</form>` tag.

### Style

```
.login-register-link {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: #888;
}
.login-register-link a {
  color: #4a90d9;
  text-decoration: none;
  font-weight: 500;
}
.login-register-link a:hover {
  text-decoration: underline;
}
```

---

## 9. Routing Specification

### In `App.tsx`

```typescript
import { RegisterPage } from './components/RegisterPage/RegisterPage'

<Routes>
  <Route
    path="/"
    element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
  />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

Both `/login` and `/register` are public (no `ProtectedRoute` wrapping).

---

## 10. Component Tree

```
main.tsx
  └─ BrowserRouter
       └─ AuthProvider
            └─ App.tsx
                 └─ Routes
                      ├─ / → redirect to /dashboard or /login
                      ├─ /login → LoginPage
                      ├─ /register → RegisterPage
                      ├─ /dashboard → ProtectedRoute → Dashboard
                      └─ * → redirect to /
```

---

## 11. Phased Implementation Plan

### Phase 1 — API Layer

| Step | File | Description |
|---|---|---|
| 1 | `src/services/api.ts` | Add `registerUser()` function calling `POST /api/users` |

**Verification**: `npm run build` passes.

### Phase 2 — Registration Page

| Step | File | Description |
|---|---|---|
| 2 | `src/components/RegisterPage/RegisterPage.tsx` | Create registration form with validation, error handling, success state |
| 3 | `src/components/RegisterPage/RegisterPage.css` | Card layout, form inputs, error/success message styles |

**Verification**: Navigate to `/register`, fill form, submit, see success.

### Phase 3 — Login Page Link

| Step | File | Description |
|---|---|---|
| 4 | `src/components/LoginPage/LoginPage.tsx` | Add "¿No tienes cuenta? Regístrate" link below the form |
| 5 | `src/components/LoginPage/LoginPage.css` | Styles for the registration prompt link |

**Verification**: Login page shows registration link; clicking takes you to `/register`.

### Phase 4 — Routing

| Step | File | Description |
|---|---|---|
| 6 | `src/App.tsx` | Add `/register` route |

**Verification**: Full flow works — login → register → login.

### Phase 5 — Polish

| Step | File | Description |
|---|---|---|
| 7 | `AGENTS.md` | Update architecture to mention `/register` route |
| 8 | `README.md` | Add registration instructions (if desired) |

### Phase 6 — Tests

| Step | File | Description |
|---|---|---|
| 9 | `src/tests/RegisterPage.test.tsx` | Test render, validation, duplicate username error, success state, redirect when authenticated |
| 10 | Update `src/tests/LoginPage.test.tsx` | Add test for registration link presence |

---

## 12. Risks and Edge Cases

| Risk | Severity | Mitigation |
|---|---|---|
| **Registration returns no token** | Low | UX pattern is clear: show success message, user clicks "sign in" |
| **Double form submission** | Low | Submit button disabled while `isLoading === true` |
| **Password mismatch** | Low | Client-side validation catches before network call |
| **Username already taken** | Low | 409 from API → inline error shown to user |
| **Already-authenticated user visits /register** | Low | `RegisterPage` redirects to `/dashboard` |
| **Backend is down** | Low | Generic server error message shown, form remains filled |
