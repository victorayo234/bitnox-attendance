/**
 * Automated Test Suite for:
 * Admin Attendance Console (/admin & /api/admin/attendance)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgybttxymvdsavxcmhwc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTg5NDcsImV4cCI6MjEwNjgzNDk0N30.DGZ39GK-HhHvytA7rZTf6LUvktg_0DqwUmTEpMYcQWs';

const APP_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@bitnox.qc';
const ADMIN_PASSWORD = 'Password123!';
const STUDENT_EMAIL = 'student@bitnox.qc';
const STUDENT_PASSWORD = 'Password123!';

async function runTests() {
  console.log('========================================================');
  console.log('         TESTING ADMIN ATTENDANCE CONSOLE               ');
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

  // --- TEST 1: Unauthenticated user redirected ---
  console.log('--- TEST 1: Unauthenticated request to /admin redirects to login ---');
  const resUnauth = await fetch(`${APP_URL}/admin`, { redirect: 'manual' });
  assert(
    resUnauth.status === 307 && (resUnauth.headers.get('location') || '').includes('/login'),
    'Unauthenticated /admin redirects to login'
  );

  // --- TEST 2: Student accessing /admin redirected to /student ---
  console.log('--- TEST 2: Student account accessing /admin redirected to /student ---');
  const resStudent = await fetch(`${APP_URL}/admin`, {
    headers: { Cookie: studentCookie },
    redirect: 'manual',
  });
  assert(
    resStudent.status === 307 && (resStudent.headers.get('location') || '').includes('/student'),
    'Student accessing /admin is redirected to /student'
  );

  // --- TEST 3: Admin access to /admin loads dashboard ---
  console.log('--- TEST 3: Admin accessing /admin renders attendance console ---');
  const resAdmin = await fetch(`${APP_URL}/admin`, {
    headers: { Cookie: adminCookie },
  });
  const adminHtml = await resAdmin.text();

  assert(resAdmin.status === 200, 'Admin receives 200 OK on /admin');
  assert(
    adminHtml.includes('Active Students') &&
      adminHtml.includes('Currently In') &&
      adminHtml.includes('Checked Out') &&
      adminHtml.includes('Not Yet In'),
    'Top stat cards (Active Students, Currently In, Checked Out, Not Yet In) are rendered'
  );

  assert(
    adminHtml.includes('Today&#x27;s Attendance') || adminHtml.includes("Today's Attendance") || adminHtml.includes('Attendance Records'),
    'Today attendance table header is rendered'
  );

  assert(
    adminHtml.includes('Search student by name or email') &&
      adminHtml.includes('All (') &&
      adminHtml.includes('In (') &&
      adminHtml.includes('Out (') &&
      adminHtml.includes('Not yet in (') &&
      adminHtml.includes('Late ('),
    'Search box and filter chips (All, In, Out, Not yet in, Late) are rendered'
  );

  // --- TEST 4: GET /api/admin/attendance as admin returns structured data ---
  console.log('\n--- TEST 4: GET /api/admin/attendance returns structured data ---');
  const resApi = await fetch(`${APP_URL}/api/admin/attendance`, {
    headers: { Cookie: adminCookie },
  });
  const apiData = await resApi.json();

  assert(resApi.status === 200 && apiData.ok === true, 'GET /api/admin/attendance returns 200 OK');
  assert(
    apiData.data &&
      typeof apiData.data.stats.totalActiveStudents === 'number' &&
      typeof apiData.data.stats.currentlyIn === 'number' &&
      typeof apiData.data.stats.checkedOut === 'number' &&
      typeof apiData.data.stats.notYetIn === 'number',
    'API returns stats with numbers computed for Lagos date'
  );
  assert(
    Array.isArray(apiData.data.students) && apiData.data.students.length > 0,
    `API returns student list (found ${apiData.data.students.length} students)`
  );

  // --- TEST 5: Student cannot call GET /api/admin/attendance ---
  console.log('\n--- TEST 5: Student cannot access GET /api/admin/attendance ---');
  const resStudentApi = await fetch(`${APP_URL}/api/admin/attendance`, {
    headers: { Cookie: studentCookie },
  });
  assert(resStudentApi.status === 403, 'Student calling admin attendance API returns 403 Forbidden');

  // --- TEST 6: Row Actions Verification (Mark check_in, Mark check_out, Clear) ---
  console.log('\n--- TEST 6: Admin row action APIs (Mark Present, Mark Out, Clear) ---');
  const targetStudentId = studentAuth.user.id;
  const todayDate = apiData.data.todayDate;

  // 6a. Mark Check-In
  const resMarkIn = await fetch(`${APP_URL}/api/admin/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      studentId: targetStudentId,
      date: todayDate,
      action: 'check_in',
      time: '08:15',
    }),
  });
  const markInData = await resMarkIn.json();
  assert(
    resMarkIn.status === 200 && markInData.ok === true && markInData.attendance.marked_by_admin === true,
    'Admin can mark check-in, setting marked_by_admin = true'
  );

  // 6b. Verify data reflects check-in
  const resVerifyIn = await fetch(`${APP_URL}/api/admin/attendance?date=${todayDate}`, {
    headers: { Cookie: adminCookie },
  });
  const verifyInData = await resVerifyIn.json();
  const studentAfterIn = verifyInData.data.students.find((s) => s.studentId === targetStudentId);
  assert(
    studentAfterIn && studentAfterIn.isCurrentlyIn === true && studentAfterIn.markedByAdmin === true,
    'Student is now Currently In with markedByAdmin = true'
  );

  // 6c. Mark Check-Out
  const resMarkOut = await fetch(`${APP_URL}/api/admin/attendance/mark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      studentId: targetStudentId,
      date: todayDate,
      action: 'check_out',
      time: '16:30',
    }),
  });
  const markOutData = await resMarkOut.json();
  assert(
    resMarkOut.status === 200 && markOutData.ok === true && markOutData.attendance.check_out_at !== null,
    'Admin can mark check-out'
  );

  // 6d. Verify data reflects checked-out
  const resVerifyOut = await fetch(`${APP_URL}/api/admin/attendance?date=${todayDate}`, {
    headers: { Cookie: adminCookie },
  });
  const verifyOutData = await resVerifyOut.json();
  const studentAfterOut = verifyOutData.data.students.find((s) => s.studentId === targetStudentId);
  assert(
    studentAfterOut && studentAfterOut.isCheckedOut === true,
    'Student is now Checked Out'
  );

  // 6e. Clear Record
  const resClear = await fetch(`${APP_URL}/api/admin/attendance/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      studentId: targetStudentId,
      date: todayDate,
    }),
  });
  const clearData = await resClear.json();
  assert(
    resClear.status === 200 && clearData.ok === true && clearData.clearedCount > 0,
    'Admin can clear attendance record'
  );

  // 6f. Verify cleared
  const resVerifyClear = await fetch(`${APP_URL}/api/admin/attendance?date=${todayDate}`, {
    headers: { Cookie: adminCookie },
  });
  const verifyClearData = await resVerifyClear.json();
  const studentAfterClear = verifyClearData.data.students.find((s) => s.studentId === targetStudentId);
  assert(
    studentAfterClear && studentAfterClear.isCheckedIn === false && studentAfterClear.isCheckedOut === false,
    'Student attendance is cleanly cleared'
  );

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
