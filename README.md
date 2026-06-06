# Gather

A multi-tenant, guest-first appointment scheduling and event management app for high-profile leaders, delegates, admins, and congregations.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-side only)
- `NEXT_PUBLIC_APP_URL` - Your application URL
- `CRON_SECRET` - A random secret for cron job security

## Supabase Setup

1. Run `supabase/migrations/001_leader_firewall.sql` in the Supabase SQL editor.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. It is used only in server actions and route handlers.
3. Enable Realtime for `appointments`, `curated_slots`, and `system_settings` if you want live dashboard updates.

## Vercel Deployment

1. Push your code to GitHub
2. Import your project in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)
   - `CRON_SECRET` (generate with: `openssl rand -base64 32`)
4. Deploy

## Built Modules

- Public microsite with curated events and frictionless guest booking.
- Two-step intake with minimum character enforcement.
- Reference generation and capacity-aware assignment server action.
- Progressive sign-up prompt after submission.
- Admin control center for delegate toggle, delegate management, calendar blocks, and bottlenecks.
- Delegate and leader agenda dashboards with day selection.
- Real-time updates for appointments and approvals.
- Supabase schema, RLS policies, triggers, round-robin assignment function, and notification outbox.
