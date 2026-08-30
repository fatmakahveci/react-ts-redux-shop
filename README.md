# ReduxCart

A full-stack shopping-cart example built with Next.js App Router, React, Redux Toolkit, TypeScript, Firebase Realtime Database and Yup.

## Architecture

- Server Components own the root layout and metadata.
- A small client provider creates an isolated Redux store.
- The browser talks only to the same-origin `/api/cart` route.
- Firebase service-account credentials remain server-side.
- Each anonymous visitor receives a 30-day, HttpOnly cart-session cookie and a separate database record.
- Runtime schemas validate both incoming requests and stored Firebase data.
- Debounced client writes and monotonic revisions prevent older requests from overwriting newer cart state.

## Requirements

- Node.js 24+
- npm
- A Firebase Realtime Database and a service account with database access

## Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and supply the Firebase Admin values.

3. Deny direct client access to Realtime Database. The repository includes `database.rules.json` and `firebase.json` with the required default-deny rules. Apply them in the Firebase console or with `npx firebase-tools deploy --only database`. Authenticated service-account requests originate only from the Next.js server.

4. Start development mode:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

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
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run check` | Run lint, typecheck, tests and build |

## Security notes

- Never expose `FIREBASE_PRIVATE_KEY` or commit a populated environment file.
- Keep Firebase client rules default-deny and grant database access only to the server service account.
- The cart cookie is opaque, HttpOnly, same-site and secure in production.
- Cart payload size, origin, field types, item counts, quantities and prices are validated server-side.

## Current product scope

Products are intentionally static demo data. The cart is anonymous and session-based; a real checkout flow should add authenticated accounts, a server-owned product catalog, inventory validation, tax/shipping calculation and payment processing.
