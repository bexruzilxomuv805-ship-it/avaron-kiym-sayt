# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run server    # start json-server (serves src/data/db.json) on PORT env or 3000
npm start         # runs dev + server concurrently (use this for local full-stack dev)
npm run build     # vite build -> dist/
npm run preview   # preview the production build
npm run lint       # oxlint
node --test tests/                    # run all tests (no npm script defined for this)
node --test tests/cartUtils.test.js   # run a single test file
```

Tests use Node's built-in `node:test` + `node:assert/strict` runner, not a JS framework — see `tests/*.test.js`. They only cover pure functions in `src/utils/`.

## Architecture

This is a Vite + React 19 storefront ("AVARON") with Tailwind v4, react-router-dom v7, Redux Toolkit, and i18next. No TypeScript.

### Data layer is hybrid: remote API + localStorage mirror

- `src/api/api.js` wraps axios, pointed at `VITE_API_BASE_URL` or falling back to a deployed json-server instance (`https://avaron-kiym-api.onrender.com`). Locally, `server.cjs` runs `json-server` against `src/data/db.json` to emulate the same REST API (`/products`, `/users`, `/orders`).
- The cart and orders are *also* kept in `localStorage` (`cart`, `orders` keys) as a local cache/fallback, independent of the server. Pages read/write both — see `src/pages/cardPages.jsx` (`handleOrderSubmit`) for the pattern: validate stock via API, POST the order, PATCH product stock, then also write to localStorage.
- `src/utils/orderUtils.js` centralizes local order storage (`readStoredOrders`, `writeStoredOrders`, `normalizeOrderStatus`, `buildOrderPayloadForDb`) and status normalization (`yangi` / `yolda` / `yetkazilgan`).
- Product-listing pages (`homePages.jsx`, `productsPage.jsx`, `favoritesPage.jsx`) also `import localData from "../data/db.json"` directly and fall back to it in the `api.get("/products")` `.catch()` — this bundles a static product snapshot into the client build so a backend-less static deploy (e.g. Netlify) still shows products. Keep this fallback in sync if you change how products are fetched/rendered.
- Because there's no shared client-side cart/order state (no context, no RTK slice for cart/orders), cross-component sync happens via `window.dispatchEvent(new Event(...))` + `window.addEventListener`, using ad hoc event names: `cart-updated`, `order-updated`, `products-updated`, and the native `storage` event. When touching cart/order/product mutation flows, keep dispatching the relevant event so other pages (e.g. `adminOrdersPage.jsx`, `TabBar.jsx`) refresh.

### Redux is auth-only

- `src/store/authSlice.js` is the only slice — holds `user`/`status`/`error`, with `loginUser`/`registerUser` thunks that call `/users` on the API (there's no real auth backend; login checks email/password by scanning the users list client-side).
- `src/store/store.js` is the store actually wired up in `main.jsx` — it wraps the root reducer in `redux-persist` (persists `auth` to localStorage) and is exported alongside `persistor`, used with `PersistGate`.
- `src/store/index.js` defines a second, non-persisted store with the same reducer but is **not imported anywhere** — don't use it; treat `store/store.js` as canonical.
- Access state via the thin wrappers in `src/store/hooks.js` (`useReduxState`, `useReduxDispatch`), not `react-redux` directly, for consistency with existing code.
- Admin gating is just `currentUser?.role === "admin"`, checked ad hoc in components (see `selectIsAdmin` in `authSlice.js`).

### Routing

- All routes are declared inline in `src/App.jsx`, with admin-only pages guarded by inline `isAdmin ? <Page/> : <NotFoundPage/>` (or `<Navigate>`) rather than a wrapper component.
- `src/routes/protectedRoute.jsx.jsx` and `src/routes/adminRoutes.jsx` define `ProtectedRoute`/`AdminRoutes` guard components but are **not used by `App.jsx`** — if you want route guarding, either wire these in or keep following the existing inline-check pattern; don't assume they're active.

### i18n

- `src/i18n.js` bundles all three locale JSON files (`src/locales/{uz,en,ru}/translation.json`) at build time and initializes i18next with `uz` as default/fallback language. Selected language persists via i18next's own `localStorage` key `i18nextLng` (read directly in `i18n.js`, separate from the redux-persist store).
- UI strings should go through `useTranslation()` / `t(...)`, with a `defaultValue` fallback (the prevailing pattern in existing pages) so missing keys degrade gracefully.

### Sizes and stock

- `src/utils/sizeUtils.js` parses a product's `size` field (comma-separated string or array, with a `!` prefix marking a size unavailable, e.g. `"!XL"`) into `availableSizes`/`unavailableSizes`, and includes a heuristic `getRecommendedSize` (age/height/weight/body type -> nearest size) used on product pages.
- Stock (`product.stock`) is decremented via API PATCH at order time (`cardPages.jsx`); there is no server-side transaction, so treat stock checks as best-effort/racy by design.
