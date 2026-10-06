/**
 * Integration Test Suite for:
 * 1. /admin/weekly (week selector, matrix P/L/A, totals, percentage, link to student)
 * 2. /admin/students/[id] (student profile, weekly attendance history)
 * 3. /admin/students (list with status, search, add student, deactivate, reset password)
 * 4. Admin Navigation (Dashboard, Weekly, Students, QR Codes)
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
  console.log('   TESTING ADMIN WEEKLY MATRIX, STUDENTS & NAVIGATION   ');
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

  // --- TEST 1: Admin Navigation Bar contains required tabs ---
  console.log('--- TEST 1: Admin Navigation Bar tabs ---');
  const resNav = await fetch(`${APP_URL}/admin`, {
    headers: { Cookie: adminCookie },
  });
  const navHtml = await resNav.text();
  assert(
    navHtml.includes('Dashboard') &&
      navHtml.includes('Weekly') &&
      navHtml.includes('Students') &&
      navHtml.includes('QR Codes'),
    'Admin Navigation contains Dashboard, Weekly, Students, and QR Codes'
  );

  // --- TEST 2: Guarding /admin/weekly server-side ---
  console.log('\n--- TEST 2: /admin/weekly server guard ---');
  const resWeeklyUnauth = await fetch(`${APP_URL}/admin/weekly`, {
    redirect: 'manual',
  });
  assert(
    resWeeklyUnauth.status === 307 && (resWeeklyUnauth.headers.get('location') || '').includes('/login'),
    'Unauthenticated /admin/weekly redirects to login'
  );

  const resWeeklyStudent = await fetch(`${APP_URL}/admin/weekly`, {
    headers: { Cookie: studentCookie },
    redirect: 'manual',
  });
  assert(
    resWeeklyStudent.status === 307 && (resWeeklyStudent.headers.get('location') || '').includes('/student'),
    'Student accessing /admin/weekly redirected to /student'
  );

  // --- TEST 3: Admin accessing /admin/weekly renders matrix ---
  console.log('\n--- TEST 3: Admin /admin/weekly matrix rendering ---');
  const resWeekly = await fetch(`${APP_URL}/admin/weekly`, {
    headers: { Cookie: adminCookie },
  });
  const weeklyHtml = await resWeekly.text();
  assert(resWeekly.status === 200, '/admin/weekly returns 200 OK');
  assert(
    weeklyHtml.includes('Weekly Attendance Matrix') &&
      weeklyHtml.includes('Previous Week') &&
      weeklyHtml.includes('Rate'),
    'Weekly Attendance Matrix renders with week selector and rate headers'
  );
  assert(
    weeklyHtml.includes('/admin/students/'),
    'Matrix contains links to individual student detail routes /admin/students/[id]'
  );

  // --- TEST 4: /admin/students/[id] renders student profile and weekly history ---
  console.log('\n--- TEST 4: /admin/students/[id] student history page ---');
  const studentId = studentAuth.user.id;
  const resStudentDetail = await fetch(`${APP_URL}/admin/students/${studentId}`, {
    headers: { Cookie: adminCookie },
  });
  const detailHtml = await resStudentDetail.text();
  assert(resStudentDetail.status === 200, '/admin/students/[id] returns 200 OK');
  assert(
    detailHtml.includes('Attendance History by Week') &&
      detailHtml.includes('Attendance Rate') &&
      detailHtml.includes('Present Days') &&
      detailHtml.includes('Reset Password'),
    'Student detail renders profile, KPI stats, weekly history, and reset password'
  );

  // --- TEST 5: /admin/students directory rendering and features ---
  console.log('\n--- TEST 5: /admin/students directory ---');
  const resStudents = await fetch(`${APP_URL}/admin/students`, {
    headers: { Cookie: adminCookie },
  });
  const studentsHtml = await resStudents.text();
  assert(resStudents.status === 200, '/admin/students returns 200 OK');
  assert(
    studentsHtml.includes('Students Directory') &&
      studentsHtml.includes('Add Student') &&
      studentsHtml.includes('Search students by name or email') &&
      studentsHtml.includes('Today&#x27;s Status') || studentsHtml.includes("Today's Status"),
    'Students directory renders search, Add Student button, and Today Status'
  );

  // --- TEST 6: Student accessing /admin/students redirected ---
  console.log('\n--- TEST 6: Student blocked from /admin/students ---');
  const resStudentsBlocked = await fetch(`${APP_URL}/admin/students`, {
    headers: { Cookie: studentCookie },
    redirect: 'manual',
  });
  assert(
    resStudentsBlocked.status === 307 && (resStudentsBlocked.headers.get('location') || '').includes('/student'),
    'Student accessing /admin/students is redirected to /student'
  );

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
