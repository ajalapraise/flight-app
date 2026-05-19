/**
 * Creates the test user used by the README's "Test credentials" section.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env — this script ONLY uses the
 * admin API. It is never imported by application code.
 *
 *   npx tsx scripts/seed-test-user.ts
 *
 * Or, if you don't have tsx installed:
 *   pnpm dlx tsx scripts/seed-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.',
  );
  process.exit(1);
}

const TEST_EMAIL = 'test@skyline.dev';
const TEST_PASSWORD = 'skyline-test-pw';

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await admin.auth.admin.listUsers();
  const already = existing?.users.find((u) => u.email === TEST_EMAIL);
  if (already) {
    console.log(`✓ Test user already exists: ${TEST_EMAIL}`);
    return;
  }

  const { error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error('Failed to create test user:', error.message);
    process.exit(1);
  }
  console.log(`✓ Created test user`);
  console.log(`   Email:    ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
}

void main();
