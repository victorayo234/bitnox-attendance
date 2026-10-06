/**
 * Automated Test Suite for Student Experience:
 * Tests all Gate states using the mock clock:
 * 1. GATE_BLOCKING: 08:00 to 12:00, no check-in -> Only <ScanGate /> rendered, no page children.
 * 2. CHECKIN_AVAILABLE_LATE: >= 12:00, no check-in -> Banner & "Scan check-in" button rendered.
 * 3. CHECKED_IN: before 12:00 with check-in -> "Check-out opens at 12:00 p.m." rendered.
 * 4. CHECKOUT_AVAILABLE: >= 12:00 with check-in -> "Check out" button rendered.
 * 5. COMPLETE: check-in and check-out complete -> "Attendance complete for today" rendered.
 * 6. NO_ACTION: before 08:00, no check-in -> "Check-in window opens at 08:00 a.m." rendered.
 * 7. Weekly Attendance Page: renders Monday to Friday schedule.
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

async function runStudentExperienceTests() {
  console.log('========================================================');
  console.log('       RUNNING STUDENT EXPERIENCE GATE STATE TESTS      ');
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

  // 1. Authenticate student
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('Failed to authenticate test student:', authError);
    process.exit(1);
  }

  const studentUser = authData.user;
  const projectRef = 'rgybttxymvdsavxcmhwc';
  const sessionCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(authData.session))}`;

  // Dedicated test date: Tuesday 2026-10-06 (Workday)
  const TEST_DATE = '2026-10-06';

  async function fetchStudentPage(mockIsoTime) {
    const cookies = `${sessionCookie}; dev_mock_time=${encodeURIComponent(mockIsoTime)}`;
    const res = await fetch(`${APP_URL}/student`, {
      headers: {
        Cookie: cookies,
      },
    });
    const html = await res.text();
    return { status: res.status, html };
  }

  // Clean initial attendance record for test date
  await adminClient
    .from('attendance')
    .delete()
    .eq('student_id', studentUser.id)
    .eq('attendance_date', TEST_DATE);

  // --- STATE 1: GATE_BLOCKING (09:30 AM Lagos, Workday, No Check-in) ---
  console.log('--- TEST 1: GATE_BLOCKING (08:00 to 12:00, No Check-in) ---');
  const resGate = await fetchStudentPage('2026-10-06T09:30:00+01:00');
  const hasGateHeading = resGate.html.includes('Scan your attendance');
  const hasGateSubtext = resGate.html.includes('welcome table to continue') && resGate.html.includes('CHECK IN');
  const hasDashboardChildren = resGate.html.includes('View Weekly Attendance');

  assert(
    resGate.status === 200 && hasGateHeading && hasGateSubtext && !hasDashboardChildren,
    `GATE_BLOCKING: ScanGate renders exclusively. Dashboard page children are NOT rendered in DOM.`
  );

  // --- STATE 2: CHECKIN_AVAILABLE_LATE (01:00 PM Lagos, No Check-in) ---
  console.log('\n--- TEST 2: CHECKIN_AVAILABLE_LATE (12:00 PM or later, No Check-in) ---');
  const resLate = await fetchStudentPage('2026-10-06T13:00:00+01:00');
  const hasLateBanner = resLate.html.includes("You haven't checked in today") || resLate.html.includes("You haven&#x27;t checked in today");
  const hasScanCheckinBtn = resLate.html.includes('Scan check-in');
  const hasGateOnLate = resLate.html.includes('Scan your attendance');

  assert(
    resLate.status === 200 && hasLateBanner && hasScanCheckinBtn && !hasGateOnLate,
    `CHECKIN_AVAILABLE_LATE: Gate unblocks, dashboard renders late notice and 'Scan check-in' button.`
  );

  // --- STATE 3: CHECKED_IN (09:30 AM Lagos, Check-in at 08:15 AM) ---
  console.log('\n--- TEST 3: CHECKED_IN Before Noon (09:30 AM Lagos, Checked In at 08:15 AM) ---');
  await adminClient.from('attendance').upsert({
    student_id: studentUser.id,
    attendance_date: TEST_DATE,
    check_in_at: '2026-10-06T07:15:00.000Z', // 08:15 AM Lagos
    check_out_at: null,
    status: 'present',
    marked_by_admin: false,
  });

  const resCheckedIn = await fetchStudentPage('2026-10-06T09:30:00+01:00');
  const hasCheckInTime = resCheckedIn.html.includes('08:15 AM');
  const hasCheckOutOpensNotice = resCheckedIn.html.includes('Check-out opens at 12:00 p.m.');
  const hasCheckOutBtnEarly = resCheckedIn.html.includes('Check out</button>');

  assert(
    resCheckedIn.status === 200 && hasCheckInTime && hasCheckOutOpensNotice && !hasCheckOutBtnEarly,
    `CHECKED_IN: Displays check-in time and muted note 'Check-out opens at 12:00 p.m.'. Check-out button is hidden.`
  );

  // --- STATE 4: CHECKOUT_AVAILABLE (01:30 PM Lagos, Checked In at 08:15 AM) ---
  console.log('\n--- TEST 4: CHECKOUT_AVAILABLE (12:00 PM or later, Checked In, Not Checked Out) ---');
  const resCheckoutAvail = await fetchStudentPage('2026-10-06T13:30:00+01:00');
  const hasCheckOutButton = resCheckoutAvail.html.includes('Check out');

  assert(
    resCheckoutAvail.status === 200 && hasCheckOutButton,
    `CHECKOUT_AVAILABLE: Displays prominent navy 'Check out' button.`
  );

  // --- STATE 5: COMPLETE (Both Check-In & Check-Out Done) ---
  console.log('\n--- TEST 5: COMPLETE (Both Check-In & Check-Out Done) ---');
  await adminClient.from('attendance').update({
    check_out_at: '2026-10-06T15:40:00.000Z', // 16:40 Lagos
  }).eq('student_id', studentUser.id).eq('attendance_date', TEST_DATE);

  const resComplete = await fetchStudentPage('2026-10-06T17:00:00+01:00');
  const hasCompleteText = resComplete.html.includes('Attendance complete for today');
  const hasCheckOutLogged = resComplete.html.includes('Checked out at') && resComplete.html.includes('04:40 PM');

  assert(
    resComplete.status === 200 && hasCompleteText && hasCheckOutLogged,
    `COMPLETE: Displays 'Checked out at 04:40 PM' and 'Attendance complete for today'.`
  );

  // --- STATE 6: NO_ACTION (07:30 AM Lagos, Workday, No Check-in Yet) ---
  console.log('\n--- TEST 6: NO_ACTION (Before 08:00 AM on Workday, No Check-in) ---');
  await adminClient
    .from('attendance')
    .delete()
    .eq('student_id', studentUser.id)
    .eq('attendance_date', TEST_DATE);

  const resNoAction = await fetchStudentPage('2026-10-06T07:30:00+01:00');
  const hasNoActionNotice = resNoAction.html.includes('Check-in window opens at 08:00 a.m.');
  const hasGateOnNoAction = resNoAction.html.includes('Scan your attendance');

  assert(
    resNoAction.status === 200 && hasNoActionNotice && !hasGateOnNoAction,
    `NO_ACTION: Before 08:00 AM, gate does not block; informative note displayed.`
  );

  // --- TEST 7: Weekly Attendance Page ---
  console.log('\n--- TEST 7: Weekly Attendance Navigation & Page ---');
  const weeklyRes = await fetch(`${APP_URL}/student/weekly`, {
    headers: {
      Cookie: sessionCookie,
    },
  });
  const weeklyHtml = await weeklyRes.text();
  const hasWeeklyTitle = weeklyHtml.includes('Weekly Attendance');
  const hasSchedule = weeklyHtml.includes('Monday to Friday Schedule');

  assert(
    weeklyRes.status === 200 && hasWeeklyTitle && hasSchedule,
    `Weekly Attendance: /student/weekly loads properly with schedule breakdown.`
  );

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentExperienceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
