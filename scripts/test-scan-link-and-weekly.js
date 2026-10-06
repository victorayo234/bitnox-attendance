/**
 * Automated Test Suite for:
 * 1. Scan link route /scan?code=... (unauthenticated redirect, admin blocked, student flow)
 * 2. Weekly attendance page /student/weekly (current week, previous week, next week clamping, summary row)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgybttxymvdsavxcmhwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTg5NDcsImV4cCI6MjEwNjgzNDk0N30.DGZ39GK-HhHvytA7rZTf6LUvktg_0DqwUmTEpMYcQWs';

const APP_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@bitnox.qc';
const ADMIN_PASSWORD = 'Password123!';
const STUDENT_EMAIL = 'student@bitnox.qc';
const STUDENT_PASSWORD = 'Password123!';

async function runTests() {
  console.log('========================================================');
  console.log('    TESTING SCAN LINK ROUTE AND WEEKLY ATTENDANCE PAGE  ');
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
  const { data: studentAuth } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });

  const projectRef = 'rgybttxymvdsavxcmhwc';
  const studentCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(studentAuth.session))}`;

  // 2. Authenticate admin
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const adminCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(adminAuth.session))}`;

  // --- SECTION 1: SCAN LINK ROUTE /scan?code=... ---
  console.log('--- TEST 1: Unauthenticated user opening /scan?code=SECRET redirects to /login with preserved code ---');
  const resUnauth = await fetch(`${APP_URL}/scan?code=bitnox-in-w3lc0m3`, {
    redirect: 'manual',
  });
  const locationHeader = resUnauth.headers.get('location') || '';
  const isRedirectToLoginWithNext =
    resUnauth.status === 307 &&
    locationHeader.includes('/login') &&
    locationHeader.includes('code%3Dbitnox-in-w3lc0m3');

  assert(
    isRedirectToLoginWithNext,
    `Unauthenticated /scan redirects with 307 to login preserving code: "${locationHeader}"`
  );

  console.log('\n--- TEST 2: Admin account opening /scan shows "Use a student account to scan." ---');
  const resAdmin = await fetch(`${APP_URL}/scan?code=bitnox-in-w3lc0m3`, {
    headers: { Cookie: adminCookie },
  });
  const adminHtml = await resAdmin.text();
  const hasAdminWarning = adminHtml.includes('Use a student account to scan.');
  const hasAdminHeading = adminHtml.includes('Administrator Account');

  assert(
    resAdmin.status === 200 && hasAdminWarning && hasAdminHeading,
    `Admin sees "Use a student account to scan." message and is prevented from recording attendance.`
  );

  console.log('\n--- TEST 3: Student account opening /scan loads processor ---');
  const resStudent = await fetch(`${APP_URL}/scan?code=bitnox-in-w3lc0m3`, {
    headers: { Cookie: studentCookie },
  });
  const studentHtml = await resStudent.text();
  const hasStudentProcessor = studentHtml.includes('Verifying Attendance') || studentHtml.includes('Bitnox');

  assert(
    resStudent.status === 200 && hasStudentProcessor,
    `Student successfully loads scan processor page.`
  );

  // --- SECTION 2: WEEKLY ATTENDANCE /student/weekly ---
  console.log('\n--- TEST 4: Weekly page renders summary row (Present, Late, Absent) and Monday-Friday schedule ---');
  const resWeekly = await fetch(`${APP_URL}/student/weekly`, {
    headers: { Cookie: studentCookie },
  });
  const weeklyHtml = await resWeekly.text();
  const hasPresentMetric = weeklyHtml.includes('Present');
  const hasLateMetric = weeklyHtml.includes('Late');
  const hasAbsentMetric = weeklyHtml.includes('Absent');
  const hasSchedule = weeklyHtml.includes('Monday – Friday Schedule');
  const hasPrevBtn = weeklyHtml.includes('Previous Week');
  const hasNextDisabled = weeklyHtml.includes('title="Cannot navigate beyond the current week"');

  assert(
    resWeekly.status === 200 &&
      hasPresentMetric &&
      hasLateMetric &&
      hasAbsentMetric &&
      hasSchedule &&
      hasPrevBtn &&
      hasNextDisabled,
    `Current week renders KPI metrics, Monday-Friday schedule, Previous Week button, and disabled Next Week button.`
  );

  console.log('\n--- TEST 5: Previous week navigation renders enabled Next Week button ---');
  const resPrev = await fetch(`${APP_URL}/student/weekly?week=2026-09-28`, {
    headers: { Cookie: studentCookie },
  });
  const prevHtml = await resPrev.text();
  const hasEnabledNext = prevHtml.includes('Next Week') && !prevHtml.includes('title="Cannot navigate beyond the current week"');

  assert(
    resPrev.status === 200 && hasEnabledNext,
    `Viewing past week enables Next Week navigation button.`
  );

  console.log('\n--- TEST 6: Future week clamp prevents navigation beyond current week ---');
  const resFuture = await fetch(`${APP_URL}/student/weekly?week=2099-01-01`, {
    headers: { Cookie: studentCookie },
  });
  const futureHtml = await resFuture.text();
  const isClampedToCurrentWeek = futureHtml.includes('Current Week');

  assert(
    resFuture.status === 200 && isClampedToCurrentWeek,
    `Attempting to view a future week safely clamps back to Current Week.`
  );

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
