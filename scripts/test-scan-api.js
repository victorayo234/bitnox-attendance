/**
 * Automated Test Suite for POST /api/attendance/scan
 * Tests:
 * 1. Wrong QR code -> 400 INVALID_CODE
 * 2. OUT during gate (no check-in, 09:00 Lagos) -> 403 WRONG_CODE_NEED_CHECKIN
 * 3. Valid check-in (08:15 Lagos) -> 200 OK, type IN, status present, greeting
 * 4. Double check-in -> 409 ALREADY_CHECKED_IN
 * 5. Check-out before noon (11:30 Lagos) -> 403 CHECKOUT_NOT_OPEN
 * 6. Valid check-out (13:00 Lagos) -> 200 OK, type OUT, greeting
 * 7. Double check-out -> 409 ALREADY_CHECKED_OUT
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgybttxymvdsavxcmhwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTg5NDcsImV4cCI6MjEwNjgzNDk0N30.DGZ39GK-HhHvytA7rZTf6LUvktg_0DqwUmTEpMYcQWs';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTI1ODk0NywiZXhwIjoyMTA2ODM0OTQ3fQ.Scb831UaBgv5aGEdsorTqqQf5j1epDUWex46r57GJjI';

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APP_URL = 'http://localhost:3000';
const STUDENT_EMAIL = 'student@bitnox.qc';
const STUDENT_PASSWORD = 'Password123!';

// Helper to construct UTC timestamp for a specific Lagos time (Lagos is UTC+1)
function makeLagosTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  // Lagos time (hours) = UTC (hours - 1)
  const d = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes, seconds || 0));
  return d.toISOString();
}

async function runScanTests() {
  console.log('========================================================');
  console.log('      RUNNING ATTENDANCE SCAN API INTEGRATION TESTS     ');
  console.log('========================================================\n');

  // 1. Authenticate test student
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('Failed to log in test student:', authError);
    process.exit(1);
  }

  const studentUser = authData.user;
  const projectRef = 'rgybttxymvdsavxcmhwc';
  const cookieHeader = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(authData.session))}`;

  // Use a dedicated date for isolated test run: "2026-10-08" (a Thursday)
  const TEST_DATE = '2026-10-08';

  // Clean up any existing record for this date to start fresh
  await adminClient
    .from('attendance')
    .delete()
    .eq('student_id', studentUser.id)
    .eq('attendance_date', TEST_DATE);

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

  // Helper to call scan API
  async function callScanApi(code, mockTime) {
    const res = await fetch(`${APP_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        ...(mockTime ? { 'x-mock-time': mockTime } : {}),
      },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    return { status: res.status, data: json };
  }

  // --- TEST 1: Wrong QR Code ---
  console.log('--- TEST 1: Wrong Code ---');
  const resWrong = await callScanApi('fake-unknown-secret-12345');
  assert(
    resWrong.status === 400 && resWrong.data.code === 'INVALID_CODE',
    `Wrong code returned 400 INVALID_CODE: "${resWrong.data.message}"`
  );

  // --- TEST 2: OUT during gate (no check-in today, 09:00 Lagos) ---
  console.log('\n--- TEST 2: OUT Code During Gate Window (No Check-in) ---');
  const time0900 = makeLagosTime(TEST_DATE, '09:00:00');
  const resOutGate = await callScanApi('https://attendance.bitnox.com/?code=bitnox-out-g00dby3', time0900);
  assert(
    resOutGate.status === 403 && resOutGate.data.code === 'WRONG_CODE_NEED_CHECKIN',
    `OUT during gate returned 403 WRONG_CODE_NEED_CHECKIN: "${resOutGate.data.message}"`
  );

  // --- TEST 3: Valid Check-In (08:15 Lagos) ---
  console.log('\n--- TEST 3: Valid Check-In Flow (08:15 AM) ---');
  const time0815 = makeLagosTime(TEST_DATE, '08:15:00');
  const resValidIn = await callScanApi('https://attendance.bitnox.com/scan?code=bitnox-in-w3lc0m3', time0815);
  assert(
    resValidIn.status === 200 &&
      resValidIn.data.ok === true &&
      resValidIn.data.type === 'IN' &&
      resValidIn.data.status === 'present' &&
      resValidIn.data.message.includes('Good Morning'),
    `Valid check-in returned 200 OK: type=${resValidIn.data.type}, status=${resValidIn.data.status}, message="${resValidIn.data.message}"`
  );

  // --- TEST 4: Double Check-In ---
  console.log('\n--- TEST 4: Double Check-In Rejection ---');
  const time0835 = makeLagosTime(TEST_DATE, '08:35:00');
  const resDoubleIn = await callScanApi('bitnox-in-w3lc0m3', time0835);
  assert(
    resDoubleIn.status === 409 && resDoubleIn.data.code === 'ALREADY_CHECKED_IN',
    `Double check-in returned 409 ALREADY_CHECKED_IN: "${resDoubleIn.data.message}"`
  );

  // --- TEST 5: Check-Out Before Noon (11:30 Lagos) ---
  console.log('\n--- TEST 5: Check-Out Attempt Before 12:00 PM ---');
  const time1130 = makeLagosTime(TEST_DATE, '11:30:00');
  const resEarlyOut = await callScanApi('bitnox-out-g00dby3', time1130);
  assert(
    resEarlyOut.status === 403 && resEarlyOut.data.code === 'CHECKOUT_NOT_OPEN',
    `Check-out before noon returned 403 CHECKOUT_NOT_OPEN: "${resEarlyOut.data.message}"`
  );

  // --- TEST 6: Valid Check-Out (13:00 Lagos) ---
  console.log('\n--- TEST 6: Valid Check-Out Flow (01:00 PM) ---');
  const time1300 = makeLagosTime(TEST_DATE, '13:00:00');
  const resValidOut = await callScanApi('bitnox-out-g00dby3', time1300);
  assert(
    resValidOut.status === 200 &&
      resValidOut.data.ok === true &&
      resValidOut.data.type === 'OUT' &&
      resValidOut.data.message.includes('Goodnight'),
    `Valid check-out returned 200 OK: type=${resValidOut.data.type}, message="${resValidOut.data.message}"`
  );

  // --- TEST 7: Double Check-Out ---
  console.log('\n--- TEST 7: Double Check-Out Rejection ---');
  const time1315 = makeLagosTime(TEST_DATE, '13:15:00');
  const resDoubleOut = await callScanApi('bitnox-out-g00dby3', time1315);
  assert(
    resDoubleOut.status === 409 && resDoubleOut.data.code === 'ALREADY_CHECKED_OUT',
    `Double check-out returned 409 ALREADY_CHECKED_OUT: "${resDoubleOut.data.message}"`
  );

  // Clean up test attendance row
  await adminClient
    .from('attendance')
    .delete()
    .eq('student_id', studentUser.id)
    .eq('attendance_date', TEST_DATE);

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');
}

runScanTests().catch(console.error);
