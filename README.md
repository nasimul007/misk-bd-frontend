This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local database

Postgres 17 + Prisma. No Docker needed; `scripts/db-dev.sh` runs a private Postgres on port 5433 (data in `~/.local/share/misk-bd-pg`).

```bash
cp .env.example .env     # once
npm run db:start         # start Postgres and create the misk_bd database
npm run db:migrate       # apply migrations
npm run db:seed          # load the prototype catalogue (safe to re-run)
npm run db:studio        # browse the data
```

The storefront reads the catalogue from Postgres (`lib/data/index.ts`). Orders are created on the server (`lib/server/orders.ts`), which re-prices every line and locks stock inside one transaction; the browser only keeps a guest token per order.

## Customer accounts

Sign-in is verified on the server (`lib/server/auth.ts`): phone OTP, email + password (argon2id) and password reset. Sessions are opaque httpOnly cookies backed by the `auth_sessions` table. Guest orders made in a browser are attached to the account when the customer signs in.

Set `AUTH_SECRET` in `.env` (see `.env.example`). SMS and email use the `console` provider in development, which prints the OTP or reset link to the server log. Production needs real providers in `lib/server/notify.ts`; the console provider refuses to run there. Google sign-in is not built yet (needs OAuth credentials).

## Admin panel

Lives at `/admin` (linked as "Store Admin" in the footer) with its own staff accounts, cookie and layout. Two roles, enforced on the server for every page and action:

- **Owner**: everything. Overview with revenue, Products, Sections (collections and sub-sections), Discounts, Orders, Inventory, Site content (hero, trust bar, manifesto, categories, testimonials, call to action, footer), Staff access, image upload.
- **Admin**: Overview (no revenue), Orders and Inventory only.

Changes to products, discounts, sections and site content update the public store immediately. Stock changes from staff and from orders are all recorded in the Inventory history.

Create the first account (it prints a one-time password you must change at first sign-in):

```bash
npm run admin:create -- owner "Your Name" owner
```

Sessions end after 15 minutes without activity, accounts lock after repeated wrong passwords, and every change is recorded in `audit_log`. Every mutation re-checks the staff role on the server (`assertStaff` in `lib/server/staff-session.ts`); hiding a menu item is cosmetic.

Image uploads are re-encoded (WebP, max 1600px) and stored by `lib/server/storage.ts`. The `local` provider writes to `public/uploads` and is for development only; production needs an object-storage provider added there.

Keep the database timezone on UTC (managed hosts do by default). `scripts/db-dev.sh` already starts the local database that way.

## Online payment (SSLCommerz)

Card and mobile banking checkout runs through SSLCommerz's hosted page. Bangladeshi shoppers who pick it are sent to the gateway after the order is saved; the order and its stock are held for 30 minutes.

Set these in `.env` (see `.env.example`). With the store id empty, the method is switched off and checkout refuses it.

| Variable | Notes |
| --- | --- |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | Sandbox keys from the SSLCommerz developer sandbox; live keys for production |
| `SSLCOMMERZ_MODE` | `sandbox` (default) or `live` |
| `APP_URL` | Public https address. SSLCommerz calls `/api/pay/sslcommerz/{success,fail,cancel,ipn}` on it, so `localhost` cannot receive them: use your tunnel URL when testing |
| `CRON_SECRET` | 16+ random characters. Protects `/api/cron/expire-orders` |

How it stays safe: the browser return and the IPN are only hints. A payment counts once SSLCommerz's validation service confirms it, the amount and currency match the order, and the order row is locked while it is applied, so repeats are harmless. Unpaid orders are cancelled and their stock released after the hold; run `GET /api/cron/expire-orders` with `Authorization: Bearer $CRON_SECRET` every 5 minutes (Vercel Cron does this). Checkout also sweeps expired orders before each new order.

Going live: set live credentials and `SSLCOMMERZ_MODE="live"`, set `APP_URL` to the production domain, register the IPN address `https://<domain>/api/pay/sslcommerz/ipn` in the SSLCommerz merchant panel, then place one small real order. Refunds are made in the SSLCommerz panel for now.
