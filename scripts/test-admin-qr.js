/**
 * Integration Test Suite for:
 * /admin/qr (Server-side generated QR codes, print posters, 403 protection, secret secrecy)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rgybttxymvdsavxcmhwc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTg5NDcsImV4cCI6MjEwNjgzNDk0N30.DGZ39GK-HhHvytA7rZTf6LUvktg_0DqwUmTEpMYcQWs';

const APP_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@bitnox.qc';
const ADMIN_PASSWORD = 'Password123!';
const STUDENT_EMAIL = 'student@bitnox.qc';
const STUDENT_PASSWORD = 'Password123!';

// Load env secrets from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const inSecretMatch = envContent.match(/QR_IN_SECRET=([^\r\n]+)/);
const outSecretMatch = envContent.match(/QR_OUT_SECRET=([^\r\n]+)/);
const expectedInSecret = inSecretMatch ? inSecretMatch[1].trim() : '';
const expectedOutSecret = outSecretMatch ? outSecretMatch[1].trim() : '';

async function runTests() {
  console.log('========================================================');
  console.log('            TESTING /admin/qr POSTERS & SECURITY        ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const projectRef = 'rgybttxymvdsavxcmhwc';

  // 1. Authenticate admin
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const adminCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(
    JSON.stringify(adminAuth.session)
  )}`;

  // 2. Authenticate student
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: studentAuth } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });
  const studentCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(
    JSON.stringify(studentAuth.session)
  )}`;

  // --- TEST 1: Unauthenticated request to /admin/qr returns 403 ---
  console.log('--- TEST 1: Unauthenticated request to /admin/qr returns 403 ---');
  const resUnauth = await fetch(`${APP_URL}/admin/qr`, { redirect: 'manual' });
  assert(resUnauth.status === 403, `Unauthenticated /admin/qr returns 403 (got ${resUnauth.status})`);

  // --- TEST 2: Student accessing /admin/qr returns 403 ---
  console.log('\n--- TEST 2: Student accessing /admin/qr returns 403 ---');
  const resStudent = await fetch(`${APP_URL}/admin/qr`, {
    headers: { Cookie: studentCookie },
    redirect: 'manual',
  });
  assert(resStudent.status === 403, `Student accessing /admin/qr returns 403 (got ${resStudent.status})`);

  // --- TEST 3: Admin accessing /admin/qr returns 200 OK ---
  console.log('\n--- TEST 3: Admin accessing /admin/qr returns 200 OK ---');
  const resAdmin = await fetch(`${APP_URL}/admin/qr`, {
    headers: { Cookie: adminCookie },
  });
  const html = await resAdmin.text();
  assert(resAdmin.status === 200, `Admin receives 200 OK on /admin/qr`);

  // --- TEST 4: Layout and Required Content ---
  console.log('\n--- TEST 4: Layout and Required Content in HTML ---');
  assert(html.includes('CHECK IN'), 'Contains "CHECK IN" heading');
  assert(html.includes('CHECK OUT'), 'Contains "CHECK OUT" heading');
  assert(html.includes('/images/bitnox-logo.png'), 'Contains Bitnox logo image reference');
  assert(
    html.includes('Scan with the Bitnox Attendance app'),
    'Contains one-line instruction "Scan with the Bitnox Attendance app"'
  );
  assert(
    html.includes('Before pasting these up, scan each printed copy with the app to confirm it works.'),
    'Contains Test scan note'
  );
  assert(
    html.includes('Managing QR Code Secrets') && html.includes('Vercel'),
    'Contains admin help section mentioning Vercel environment variables'
  );
  assert(
    html.includes('@media print') && html.includes('page-break-after'),
    'Contains print-optimized CSS with page breaks'
  );

  // --- TEST 5: QR Images generated and Data URLs present ---
  console.log('\n--- TEST 5: Generated QR code data URLs ---');
  const dataUrlCount = (html.match(/data:image\/png;base64,/g) || []).length;
  assert(
    dataUrlCount >= 2,
    `Contains at least 2 generated QR code data URLs (found ${dataUrlCount})`
  );

  // --- TEST 6: CRITICAL SECURITY - Raw secrets NEVER sent as text ---
  console.log('\n--- TEST 6: Raw secrets NEVER leaked in HTML as text ---');
  assert(expectedInSecret.length > 0 && expectedOutSecret.length > 0, 'Loaded expected secrets from .env.local');
  const inSecretLeaked = html.includes(expectedInSecret);
  const outSecretLeaked = html.includes(expectedOutSecret);
  assert(
    !inSecretLeaked && !outSecretLeaked,
    'Raw QR_IN_SECRET and QR_OUT_SECRET are strictly NOT present in the HTML response'
  );

  // --- TEST 7: No QR images stored in repo or public directory ---
  console.log('\n--- TEST 7: No QR image files on disk or public folder ---');
  const publicFiles = fs.readdirSync(path.join(__dirname, '..', 'public'));
  const publicImageFiles = fs.existsSync(path.join(__dirname, '..', 'public', 'images'))
    ? fs.readdirSync(path.join(__dirname, '..', 'public', 'images'))
    : [];
  const hasDiskQr = [...publicFiles, ...publicImageFiles].some((f) =>
    f.toLowerCase().includes('qr')
  );
  assert(!hasDiskQr, 'No QR image files saved to disk in public/ or public/images/');

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
