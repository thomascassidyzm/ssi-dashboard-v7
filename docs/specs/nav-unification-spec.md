# Build spec — Nav unification (Option A: Home at `/`, one persistent top bar)

**Status:** ready to implement. Authored 2026-06-22 from a design session with Tom.
**Scope:** dashboard frontend (`src/`).
**Overlaps:** the active `feat/nav-home-admin-hubs` branch (the Home + Admin hubs landed there). **Do this work ON that branch** to avoid a collision.
**Principle:** one consistent top bar everywhere; intuitive routes; Courses always one click away. Keep every page's *content* (Home panels, Docs, Courses library are all good) — only fix the **chrome** and the **route semantics**.

> ⚠️ Verify file/line refs against current code before relying on them — line numbers drift, and the nav branch is moving.

---

## 1. The problem (diagnosed)
The nav migration is half-done. The new tabbed bar (Popty · Courses · Docs · Admin) landed on the **Home hub** (`/home`, `views/Home.vue`), but the **Courses page still uses the old bespoke header** (`↑ Home  Courses`). Half the app has the new bar, half has the old one → the hodge-podge.

On top of that the routes are inverted: **`/` = `MissionControlHub` (a courses view)**, `/home` = the hub menu. The code even says *"Courses stays at '/' (most-needed); '/home' is the optional overview menu."* That made sense before there was a persistent Courses tab; with one, it's just unintuitive.

Key components:
- `src/router/index.js` — `/` → `MissionControlHub`; `/home` → `Home.vue`; `/admin` → `Admin.vue`; `/courses` → `CourseBrowser`; `/courses/:courseCode` (+ a **duplicate** `/course/:courseCode`).
- `src/components/AppNavbar.vue` — the shared navbar, but with **per-route conditional rendering** (the `↑ Home` header vs the `Popty` tabbed bar). This branching is the thing to remove.
- `src/views/Home.vue` — the hub; its "Courses" panel currently links `to="/"`.

---

## 2. The target model (Option A)

### 2a. One persistent top bar — `AppNavbar.vue`, used on EVERY route, no per-page variants
- **Left:** `Popty` brand → links to **Home** (`/`). (Drop the `↑ Home` / `Courses Popty` per-page treatments entirely.)
- **Primary tabs:** **Courses · Docs · Admin**, always visible, with an **active-state highlight** driven by the current route (`route.matched`/`route.path` prefix). This is the "one click to Courses from anywhere."
- **Right (contextual):** machine status, Deploy, history, course selector, avatar — unchanged.
- Remove all `v-if="isHome"` / per-route header branches in `AppNavbar.vue`; it renders the same structure everywhere.

### 2b. Route semantics — swap `/` and the hub
| route | before | **after** |
|---|---|---|
| `/` | `MissionControlHub` (courses view) | **`Home.vue`** (the hub with the 3 panels) |
| `/home` | `Home.vue` | **redirect → `/`** (keep the path working) |
| `/courses` | `CourseBrowser` (library) | `CourseBrowser` (unchanged — this is the library the Courses tab points at) |
| `MissionControlHub` | mounted at `/` | **retire or repoint:** its courses-list role is already covered by `CourseBrowser` at `/courses`. If it carries unique widgets, fold them into `Home.vue` or `CourseBrowser`; otherwise delete the route + component. |

- Update `Home.vue`'s **Courses panel** to link `to="/courses"` (not `/`).
- The "courses is most-needed" concern is satisfied by the always-present **Courses tab** — no need for courses at root.

### 2c. Breadcrumb for depth (the "back button")
On course-scoped routes (`/courses/:courseCode/*`), render a breadcrumb under the top bar:
`Courses / <Course display_name> / <view>` — where **"Courses" is a link to `/courses`**. That gives every course overview / script / seeds / audio page a clear one-click way back to the library, replacing the ad-hoc `↑ Home`.

### 2d. Collapse the duplicate course route
There are both `/course/:courseCode` and `/courses/:courseCode`. Pick **`/courses/:courseCode`** (plural, consistent with `/courses`) and make `/course/:courseCode` (+ its children) a **redirect** to the plural form. Update any internal links.

---

## 3. What NOT to change
- The Home hub panels, the Docs section, the CourseBrowser library UI — all good, leave their content. This is chrome + routing only.
- The contextual right-hand controls (machine/Deploy/selector/avatar).

---

## 4. Acceptance criteria
1. The **same top bar** (Popty brand + Courses/Docs/Admin tabs + contextual right) appears on Home, Courses, a course overview, Docs, and Admin — no per-page header variants remain in `AppNavbar.vue`.
2. The active tab highlights correctly for each section (incl. deep course routes highlighting **Courses**).
3. **`/` renders the Home hub**; `/home` redirects to `/`; `/courses` renders the library; the Home "Courses" panel and the Courses tab both land on `/courses`.
4. From any `/courses/:code/*` page, the breadcrumb's "Courses" link returns to `/courses` in one click.
5. `/course/:code` redirects to `/courses/:code`; no dead links.
6. Brand "Popty" returns to Home from anywhere.

---

## 5. Suggested order
1. **AppNavbar.vue** — strip per-route branches → one persistent bar with active-state tabs. (Biggest visual win; do first.)
2. **Router** — swap `/`→Home, `/home`→redirect, retire/repoint `MissionControlHub`, fix Home's Courses panel link.
3. **Breadcrumb** — add to the course-scoped layout.
4. **Collapse** `/course/:code` → `/courses/:code` redirect + link sweep.
