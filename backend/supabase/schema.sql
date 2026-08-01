-- Supabase schema for OSREN business documents (DO / Invoice / Receipt).
--
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- The backend connects with the service-role key (bypasses RLS), so no RLS
-- policies are required for v1. The mobile app never talks to Supabase
-- directly — it goes through the Node backend.

-- Customer (sales) invoices. Status: Unpaid -> Partial Paid -> Paid.
create table if not exists customer_invoices (
  id text primary key,
  invoice_number text unique not null,
  order_id text not null,
  customer text not null,
  invoice_amount numeric not null default 0,
  received_amount numeric not null default 0,
  outstanding_amount numeric not null default 0,
  status text not null default 'Unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Receipts (customer payments). One row per payment recorded against an invoice.
create table if not exists receipt_collections (
  id text primary key,
  receipt_number text not null,
  invoice_id text references customer_invoices(id) on delete cascade,
  order_id text,
  customer text not null,
  invoice_number text,
  amount_received numeric not null,
  payment_method text not null,
  reference_no text,
  remarks text,
  status text not null default 'collected',
  created_at timestamptz not null default now()
);

-- PDF ledger: every generated DO / Invoice / Receipt PDF is recorded here.
-- The PDF bytes live in the `documents` Storage bucket; this row holds the
-- reference and the public download URL.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('DO','INVOICE','RECEIPT')),
  ref_id text not null,
  doc_number text not null,
  storage_path text not null,
  public_url text,
  content_type text default 'application/pdf',
  created_at timestamptz not null default now()
);
create index if not exists documents_doc_type_idx on documents (doc_type);
create index if not exists documents_ref_id_idx   on documents (ref_id);
