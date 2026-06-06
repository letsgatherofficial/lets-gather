# Leader Firewall

A multi-tenant, guest-first appointment scheduling and event management app for high-profile leaders, delegates, admins, and congregations.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase

1. Run `supabase/migrations/001_leader_firewall.sql` in the Supabase SQL editor.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. It is used only in server actions and route handlers.
3. Enable Realtime for `appointments`, `curated_slots`, and `system_settings` if you want live dashboard updates.

## Built Modules

- Public microsite with curated events and frictionless guest booking.
- Three-step intake with minimum character enforcement.
- Reference generation and capacity-aware assignment server action.
- Progressive sign-up prompt after submission.
- Admin control center for delegate toggle, delegate management, calendar blocks, and bottlenecks.
- Delegate and leader agenda dashboards.
- Supabase schema, RLS policies, triggers, round-robin assignment function, and notification outbox.
