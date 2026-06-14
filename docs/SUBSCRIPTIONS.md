# HydroSight — Plans & subscriptions

## Plans

| Plan | Modules | Zones | Bbox max | Period | Quota | PDF/Excel |
|------|---------|-------|----------|--------|-------|-----------|
| **guest** (sans compte) | `lu` | point only | — | 3 months | 2 / jour | No |
| **free** | Land use (`lu`) | point, bbox | 25 km² | 6 months | 10 / mois | No |
| **pro** | gw, sw, lu | + province | — | 36 months | 100 / mois | Yes |
| **premium** | gw, sw, lu | + region, national | — | Unlimited | 500 / mois | Yes |

## One-time Supabase setup

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run: `supabase/migrations/001_plans.sql`, `002_guest_usage.sql`, `003_add_roles_and_contracts.sql`, and `004_admin_rls_helper.sql`
3. Confirm tables `profiles`, `usage_monthly`, `guest_usage`, and `organizations` exist.

## Backend environment

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
GUEST_JWT_SECRET=optional_separate_secret_for_demo_tokens
```

## Guest (demo) mode

- `POST /auth/guest` — issues a 24h JWT (`role=guest`, `sub=guest:<uuid>`)
- Frontend stores the token in `localStorage` when no Supabase session exists
- `/dashboard` is public; limits are enforced on `/analyse` and `/zones/resolve`

## API

- `POST /auth/guest` — anonymous demo session
- `GET /subscription/me` — plan + usage (Supabase or guest JWT)
- `POST /analyse` — enforces plan; increments usage on success
- `POST /zones/resolve` — enforces zone mode / bbox size

## Change a user's plan (development)

```sql
update public.profiles
set plan = 'pro', plan_expires_at = null
where id = 'USER_UUID_HERE';
```

Valid profile plans: `free`, `pro`, `premium`.

## Roles & admin access

`profiles.role` is either `user` (default) or `admin`.

### Create the first admin (development only)

1. Set `ADMIN_SETUP_SECRET` in the frontend environment.
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set.
3. Call the setup endpoint with the secret header:

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "x-admin-setup-secret: YOUR_SECRET"
```

This endpoint is disabled in production. For production, promote a user via SQL:

```sql
update public.profiles
set role = 'admin', contract_type = 'b2b', plan = 'premium'
where id = 'USER_UUID_HERE';
```

### Admin API (backend)

- `GET /admin/me` — current user's role (registered JWT)
- `GET /admin/users` — list profiles (admin JWT only)

## Frontend

- `/pricing` — plan comparison
- Dashboard — plan badge, guest banner, locked modules/modes, upgrade modal

## Phase 2 (not implemented)

Stripe Checkout + webhooks to update `profiles.plan` automatically.
