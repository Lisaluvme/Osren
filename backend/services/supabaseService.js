const { createClient } = require('@supabase/supabase-js');

// Service-role Supabase client. Configured only when both env vars are present,
// so the app keeps working (local JSON finance store, no document uploads)
// until Supabase is set up. The service-role key bypasses RLS — keep it
// server-side only; never ship it to the mobile client.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'documents';

let client = null;
let configured = false;

if (url && serviceKey) {
  try {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    configured = true;
    console.log('✅ Supabase client initialized (bucket:', bucket + ')');
  } catch (e) {
    console.error('❌ Supabase init failed:', e.message);
  }
} else {
  console.log(
    'ℹ️  Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing) — ' +
      'document storage disabled; finance stays on local JSON.'
  );
}

module.exports = { client, configured, bucket };
