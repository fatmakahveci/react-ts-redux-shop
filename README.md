# The Quiet Shelf

A full-stack shopping-cart example built with Next.js App Router, React, Redux Toolkit, TypeScript, Firebase Realtime Database and Yup.

## Storefront features

- Responsive six-book catalog with original local cover artwork.
- Search across titles, authors and descriptions.
- Category filtering and price/title sorting.
- Expandable book details with author, category and page information.
- Keyboard-accessible navigation and cart drawer with a skip link, descriptive controls, focus management, subtotal and free-shipping progress.
- Demo checkout with delivery details, payment choice, order confirmation and atomic server-side cart clearing.
- Offline-safe cart updates with automatic retry and visible synchronization status.
- Mobile and desktop accessibility coverage with Playwright and Axe.

## Architecture

- Server Components own the root layout and metadata.
- A small client provider creates an isolated Redux store.
- The cart and checkout UI load as a separate client chunk only when the drawer is opened; memoized product cards avoid unrelated rerenders while catalog controls change.
- The browser talks only to the same-origin `/api/cart` route.
- Firebase service-account credentials remain server-side.
- Each anonymous visitor receives a 30-day, HttpOnly cart-session cookie and a separate database record.
- Runtime schemas validate both incoming requests and stored Firebase data.
- The client sends only product IDs and `+1/-1` mutations; the server owns prices, titles and revisions.
- Each browser store persists mutations in a versioned, bounded local queue, safely compacts unsent inverse changes and retries with exponential backoff or when connectivity returns.
- Web Locks coordinate queue writes and flushes across tabs where supported; server idempotency remains the correctness fallback everywhere else.
- Every mutation carries a random idempotency key; Firebase stores a bounded deduplication history so a lost response can never apply the same quantity change twice.
- Checkout clearing reuses its own idempotency key across retries, preventing a lost response from completing the same checkout twice.
- Firebase ETag transactions serialize mutations, preserving concurrent changes from multiple tabs.
- Cart records carry expiry and persistent rate-limit metadata; an authenticated cleanup endpoint removes expired records.

## Requirements

- Node.js 24+
- npm
- Java 21+ when using the local Firebase Emulator
- A Firebase Realtime Database and service account only for production

## Local setup without Firebase permissions

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` with the local-only settings:

   ```dotenv
   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
   FIREBASE_PROJECT_ID=demo-redux-cart
   ```

3. Start the Realtime Database emulator in one terminal:

   ```bash
   npm run emulators
   ```

4. Start the application in another terminal:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The Emulator Suite UI is available at [http://127.0.0.1:4000](http://127.0.0.1:4000).

The committed `demo-redux-cart` project ID is intentionally demo-only. The app derives Firebase's canonical `demo-redux-cart-default-rtdb` namespace from it, matching the emulator's configured default database and rules. Firebase CLI does not require login or account permissions for this workflow, and the server rejects non-local emulator hosts and non-`demo-` emulator project IDs.

## Production setup

1. Copy `.env.example` to `.env.local` and supply the three Firebase service-account values plus a long random `CRON_SECRET`. Do not set `FIREBASE_DATABASE_EMULATOR_HOST` in production.

2. Deny direct client access to Realtime Database. The repository includes `database.rules.json` and `firebase.json` with the required default-deny rules. Apply them in the Firebase console or with `npx firebase-tools@15.28.2 deploy --only database`. Authenticated service-account requests originate only from the Next.js server.

3. Schedule a daily authenticated `POST /api/internal/cleanup-carts` request so expired anonymous carts are deleted. Send `Authorization: Bearer <CRON_SECRET>`. Each invocation safely removes up to 1,000 expired records in bounded, ETag-protected batches.

4. Put a managed WAF or reverse proxy rate limit in front of public deployments. The application also enforces a persistent per-session limit, but infrastructure-level limits are required to prevent attackers from creating unlimited new sessions.

5. Start development mode:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

Without Firebase environment variables, the storefront still renders and reports that cart persistence is unavailable; production deployments should always configure them.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production server after a build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run unit and component tests |
| `npm run test:coverage` | Run tests and enforce coverage thresholds |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run emulators` | Start the local Realtime Database emulator |
| `npm run test:e2e:emulator` | Run browser tests against an isolated local emulator |
| `npm run check` | Run lint, typecheck, tests and build |

## Security notes

- Never expose `FIREBASE_PRIVATE_KEY` or commit a populated environment file.
- Use only `demo-` project IDs for the repository's emulator workflow.
- Keep Firebase client rules default-deny and grant database access only to the server service account.
- The production cart cookie uses the `__Host-` prefix and is opaque, HttpOnly, SameSite=Strict and Secure.
- Cart writes require an exact scheme-and-host Origin match; request bodies are streamed through a byte limit and checked for content type and schema validity.
- Product identity, title, price and revision are controlled by the server; clients can request only quantity mutations.
- Production pages use request-specific CSP nonces instead of `unsafe-inline` scripts.
- Outbound OAuth and Firebase calls have explicit timeouts.
- Browser cart requests have explicit timeouts, a durable retry queue and server-side idempotency protection.

## Current product scope

Products are intentionally held in a small server-owned demo catalog. The cart is anonymous and session-based; a real checkout flow should move the catalog to a durable database and add authenticated accounts, inventory validation, tax/shipping calculation and payment processing.
