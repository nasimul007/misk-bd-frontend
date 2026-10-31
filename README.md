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
