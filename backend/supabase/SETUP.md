# Supabase setup (business documents: DO / Invoice / Receipt)

The app generates PDFs on the mobile device (print / share / save), then uploads
each one through the backend into Supabase so it's durably recorded and
downloadable. The backend uses the **service-role key** (kept server-side); the
mobile app never contacts Supabase directly.

> Until this is set up, the backend logs "Supabase not configured …" and the
> app still works — PDFs still print/share, they just aren't recorded, and
> invoice/receipt finance data stays on the (ephemeral) local JSON store.

## One-time setup

1. **Create a project** at https://supabase.com. Note the **Project URL** and the
   **service_role** key (Project Settings → API).
2. **Create a Storage bucket** named `documents` (Storage → New bucket). Make it
   **Public** so generated PDFs are downloadable via a direct link. (Switch to
   signed URLs later if you'd rather not make the bucket public.)
3. **Run the schema**: open SQL Editor → New query → paste `schema.sql` → Run.
   This creates `customer_invoices`, `receipt_collections`, and `documents`.
4. **Add backend env vars** (Render → Environment, or local `.env`):
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_KEY` = the service_role key
   - (optional) `SUPABASE_BUCKET` = `documents` (default)

Redeploy the backend. On boot it should log `✅ Supabase client initialized`.

## Verify

- `GET /api/pdfs` → `{ success: true, data: [] }` once configured (instead of
  the 503/empty-not-configured response).
- From the app: print an invoice / record a payment / view a DO — each upload
  writes a row to the `documents` table and a file to the `documents` bucket.

## Notes / out of scope

- Orders still live in the Google Sheet (not migrated).
- Supplier AP (supplier-invoices / payment-vouchers) still uses local JSON.
- RLS is disabled for v1 (service-role backend). Add `select` policies only if
  the app later reads Supabase directly.
