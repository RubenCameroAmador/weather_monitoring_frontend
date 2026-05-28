# Frontend Development Skill

**Description**: Use for any React/TypeScript frontend task in this repository — new components, hook changes, styling, tests, refactoring, or API integration. Loads the canonical architecture and guidelines before proceeding.

**Triggers**: Component creation, style changes, test writing, refactoring, API integration, hook logic, dependency management.

---

## Required reading before any task

Read both knowledge files in full:

```
docs/architecture.md
docs/frontend-guidelines.md
```

If they have already been read in this session, proceed. If any file mentions a path that does not exist, re-read the file to get the current content.

---

## Workflow

### 1. Orient

- Search `src/components/` for existing components matching the task domain. Never create a new component if an existing one can be extended or composed.
- Check `src/hooks/` and `src/services/` for existing data-fetching or business logic.
- Check `src/types/` for existing interfaces that match the data shape.
- Check `src/tests/` for existing test patterns.

### 2. Plan

- Identify which existing file(s) need to change.
- Only create new files if the concern has no home.
- Proposed changes must not violate any rule in `frontend-guidelines.md`. If a rule must be broken, call it out explicitly and justify.

### 3. Implement

Apply rules from `frontend-guidelines.md` in order of priority:

1. **Naming conventions** — file, export, interface, CSS class, test file naming.
2. **Folder organization** — place files in the correct directory, no nesting, no barrel files.
3. **Component rules** — named export, colocated props interface, destructured signature, no spread.
4. **TypeScript rules** — `import type`, `.tsx` extension, interfaces over types, no `any`/`enum`.
5. **Hook rules** — flat return object, no cross-hook dependencies, mandatory effect cleanup.
6. **API layer rules** — one function per endpoint, module-level `API_BASE`, no request wrapper.
7. **Style rules** — global CSS, kebab-case, Dashboard.css, no inline styles.
8. **State rules** — `useState`/`useEffect` only, no Context/reducer, derived state in body.
9. **Test rules** — Vitest + RTL, `*.test.tsx` in `src/tests/`, `describe`/`it`/`expect` imported.
10. **Performance rules** — no premature memoization.

### 4. Verify

Run these before finishing:

```bash
npm run build   # tsc -b && vite build
npm run lint    # eslint on .
npm run test    # vitest
```

If the build fails, fix type errors first, then lint, then tests. Do not commit with any of these failing.

---

## Architecture invariants (do not violate)

These are the non-negotiable architectural decisions of this project:

| Invariant | Rationale |
|---|---|
| No router | Single page app — no route configuration |
| No state library | `useState`/`useEffect` only |
| No CSS-in-JS, Tailwind, or CSS Modules | Plain global CSS in `Dashboard.css` |
| No Context API | Props-only data flow from `Dashboard` |
| No default exports (except `App.tsx`) | Named exports everywhere |
| No barrel files (`index.ts`) | Direct file path imports |
| No nested directories in `components/`, `hooks/`, `services/`, `types/` | Flat layering |
| HTTP polling every 5s | Hardcoded in `useWeatherData.ts` |
| API base hardcoded in `src/services/api.ts` | Change there or in `nginx.conf` for deployment |
| Emoji icons only (🌡️💧⚠️) | No icon library |

---

## Composition over duplication

- If a new chart variant is needed: refactor `TemperatureChart` and `HumidityChart` into a shared `LineChartCard` with `dataKey`, `color`, `unit` props. **Do not create a third nearly-identical chart component.**
- If a new indicator card is needed: refactor `CurrentIndicators` to accept a config array rather than duplicating the card layout.
- If a new data-fetching concern emerges: add to `useWeatherData` or create a new hook in `src/hooks/`. Do not inline fetch logic in components.

## Testing requirements

Every new component must have a corresponding test file in `src/tests/`. Follow the existing pattern:

- One `describe` block per component.
- Test rendering of text, conditional states, and CSS class application.
- `container.querySelector` is the current approach for CSS class assertions — prefer RTL queries (`screen.getByRole`, `screen.getByText`) where possible.

## Code review guardrails

Before marking a task complete, confirm:

- [ ] No new dependencies added without justification
- [ ] No dead code or commented-out blocks left behind
- [ ] No `console.log` or debug artifacts
- [ ] Imports use `.tsx` extension for local files
- [ ] `import type` used for type-only imports
- [ ] Props interface is colocated, not imported from a shared file
- [ ] CSS classes are kebab-case strings, not camelCase or BEM
- [ ] Effect has cleanup function
- [ ] Error state does not overwrite displayed data on reconnect
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
