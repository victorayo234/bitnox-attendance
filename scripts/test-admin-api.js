/**
 * Automated Test Suite for Admin-Only API Routes:
 * 1. POST /api/admin/attendance/mark
 * 2. POST /api/admin/attendance/clear
 * 3. POST /api/admin/students
 * 4. PATCH /api/admin/students/[id]
 *
 * Verifies:
 * - Student gets 403 on every route.
 * - Unauthenticated caller gets 403 on every route.
 * - Admin successfully creates a student, validates inputs, and rejects duplicates.
 * - Admin updates student (name, is_active, password reset).
 * - Admin marks attendance (handles future date rejection, check_out before check_in rejection, 08:30 late rule).
 * - Admin clears attendance.
 * - Cleans up test artifacts.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rgybttxymvdsavxcmhwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTg5NDcsImV4cCI6MjEwNjgzNDk0N30.DGZ39GK-HhHvytA7rZTf6LUvktg_0DqwUmTEpMYcQWs';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneWJ0dHh5bXZkc2F2eGNtaHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTI1ODk0NywiZXhwIjoyMTA2ODM0OTQ3fQ.Scb831UaBgv5aGEdsorTqqQf5j1epDUWex46r57GJjI';

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APP_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@bitnox.qc';
const ADMIN_PASSWORD = 'Password123!';
const STUDENT_EMAIL = 'student@bitnox.qc';
const STUDENT_PASSWORD = 'Password123!';

async function runAdminTests() {
  console.log('========================================================');
  console.log('        RUNNING ADMIN-ONLY API ROUTE TEST SUITE         ');
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
  const { data: studentAuth, error: studentAuthErr } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });
  if (studentAuthErr || !studentAuth.session) {
    console.error('Failed to log in student:', studentAuthErr);
    process.exit(1);
  }

  const projectRef = 'rgybttxymvdsavxcmhwc';
  const studentCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(studentAuth.session))}`;
  const studentId = studentAuth.user.id;

  // 2. Authenticate admin
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (adminAuthErr || !adminAuth.session) {
    console.error('Failed to log in admin:', adminAuthErr);
    process.exit(1);
  }

  const adminCookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(adminAuth.session))}`;

  // Helper fetch function
  async function apiCall(path, method, body, cookie) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(`${APP_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  }

  console.log('--- SECTION 1: PROVE STUDENT ACCOUNT GETS 403 ON ALL ADMIN ROUTES ---');

  // Route 1: Mark Attendance
  const r1Student = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId,
    action: 'check_in',
  }, studentCookie);
  assert(r1Student.status === 403, `POST /api/admin/attendance/mark -> 403 for student (got ${r1Student.status})`);

  // Route 2: Clear Attendance
  const r2Student = await apiCall('/api/admin/attendance/clear', 'POST', {
    studentId,
    date: '2026-10-06',
  }, studentCookie);
  assert(r2Student.status === 403, `POST /api/admin/attendance/clear -> 403 for student (got ${r2Student.status})`);

  // Route 3: Create Student
  const r3Student = await apiCall('/api/admin/students', 'POST', {
    fullName: 'Hack Student',
    email: 'hacker@example.com',
    tempPassword: 'Password123!',
  }, studentCookie);
  assert(r3Student.status === 403, `POST /api/admin/students -> 403 for student (got ${r3Student.status})`);

  // Route 4: Update Student
  const r4Student = await apiCall(`/api/admin/students/${studentId}`, 'PATCH', {
    fullName: 'Student Tampered',
  }, studentCookie);
  assert(r4Student.status === 403, `PATCH /api/admin/students/[id] -> 403 for student (got ${r4Student.status})`);

  console.log('\n--- SECTION 2: PROVE UNAUTHENTICATED CALLS GET 403 ---');
  const rNoAuth = await apiCall('/api/admin/attendance/mark', 'POST', { studentId, action: 'check_in' }, null);
  assert(rNoAuth.status === 403, `Unauthenticated request returns 403 (got ${rNoAuth.status})`);

  console.log('\n--- SECTION 3: PROVE ADMIN CREATES A STUDENT (POST /api/admin/students) ---');
  const tempEmail = `newstudent_${Date.now()}@bitnox.qc`;

  // Validation: short password
  const rShortPwd = await apiCall('/api/admin/students', 'POST', {
    fullName: 'Test Candidate',
    email: tempEmail,
    tempPassword: '123',
  }, adminCookie);
  assert(rShortPwd.status === 400, `Short password rejected with 400 (got ${rShortPwd.status})`);

  // Valid student creation
  const rCreate = await apiCall('/api/admin/students', 'POST', {
    fullName: 'Folake Adeyemi',
    email: tempEmail,
    tempPassword: 'TemporaryPass123!',
  }, adminCookie);
  assert(
    rCreate.status === 201 && rCreate.data.ok === true && rCreate.data.student.role === 'student',
    `Admin successfully creates student (status 201, role='student', id=${rCreate.data?.student?.id})`
  );

  const createdStudentId = rCreate.data?.student?.id;

  // Duplicate email check
  const rDup = await apiCall('/api/admin/students', 'POST', {
    fullName: 'Folake Duplicate',
    email: tempEmail,
    tempPassword: 'TemporaryPass123!',
  }, adminCookie);
  assert(rDup.status === 400, `Duplicate email rejected with 400 (got ${rDup.status})`);

  console.log('\n--- SECTION 4: PROVE ADMIN UPDATES A STUDENT (PATCH /api/admin/students/[id]) ---');
  // Update full name and toggle active status
  const rUpdate = await apiCall(`/api/admin/students/${createdStudentId}`, 'PATCH', {
    fullName: 'Folake Adeyemi-Johnson',
    isActive: false,
  }, adminCookie);
  assert(
    rUpdate.status === 200 &&
    rUpdate.data.profile.full_name === 'Folake Adeyemi-Johnson' &&
    rUpdate.data.profile.is_active === false,
    `Admin updates full name and sets is_active: false (status 200)`
  );

  // Reactivate student for attendance tests
  const rReactivate = await apiCall(`/api/admin/students/${createdStudentId}`, 'PATCH', {
    isActive: true,
    password: 'NewSecurePassword123!',
  }, adminCookie);
  assert(
    rReactivate.status === 200 && rReactivate.data.profile.is_active === true,
    `Admin resets password and sets is_active: true (status 200)`
  );

  console.log('\n--- SECTION 5: PROVE ADMIN ATTENDANCE MARKING (POST /api/admin/attendance/mark) ---');
  const TEST_DATE = '2026-10-06';

  // 1. Future date validation
  const rFuture = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId: createdStudentId,
    date: '2099-01-01',
    action: 'check_in',
    time: '08:15',
  }, adminCookie);
  assert(rFuture.status === 400, `Future attendance date rejected with 400 (got ${rFuture.status}: "${rFuture.data?.error}")`);

  // 2. Valid check-in at 08:20 (on-time -> "present")
  const rMarkInPresent = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
    action: 'check_in',
    time: '08:20',
  }, adminCookie);
  assert(
    rMarkInPresent.status === 200 &&
    rMarkInPresent.data.attendance.status === 'present' &&
    rMarkInPresent.data.attendance.marked_by_admin === true,
    `Admin marks check-in at 08:20 -> status='present', marked_by_admin=true`
  );

  // 3. Reject check-out before check-in time (e.g. check-out at 08:10 when check-in is 08:20)
  const rOutBeforeIn = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
    action: 'check_out',
    time: '08:10',
  }, adminCookie);
  assert(
    rOutBeforeIn.status === 400,
    `Check-out before check-in rejected with 400 (got ${rOutBeforeIn.status}: "${rOutBeforeIn.data?.error}")`
  );

  // 4. Update check-in to 08:45 (after 08:30 -> status='late')
  const rMarkInLate = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
    action: 'check_in',
    time: '08:45',
  }, adminCookie);
  assert(
    rMarkInLate.status === 200 &&
    rMarkInLate.data.attendance.status === 'late',
    `Admin updates check-in to 08:45 -> computed status='late'`
  );

  // 5. Valid check-out at 16:30
  const rMarkOut = await apiCall('/api/admin/attendance/mark', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
    action: 'check_out',
    time: '16:30',
  }, adminCookie);
  assert(
    rMarkOut.status === 200 &&
    Boolean(rMarkOut.data.attendance.check_out_at) &&
    rMarkOut.data.attendance.marked_by_admin === true,
    `Admin marks check-out at 16:30 -> check_out_at set, marked_by_admin=true`
  );

  console.log('\n--- SECTION 6: PROVE ADMIN ATTENDANCE CLEAR (POST /api/admin/attendance/clear) ---');
  // Clear attendance for that date
  const rClear = await apiCall('/api/admin/attendance/clear', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
  }, adminCookie);
  assert(
    rClear.status === 200 && rClear.data.clearedCount === 1,
    `Admin clears attendance record -> clearedCount=1`
  );

  // Clearing again returns clearedCount=0
  const rClearAgain = await apiCall('/api/admin/attendance/clear', 'POST', {
    studentId: createdStudentId,
    date: TEST_DATE,
  }, adminCookie);
  assert(
    rClearAgain.status === 200 && rClearAgain.data.clearedCount === 0,
    `Clearing again -> clearedCount=0`
  );

  console.log('\n--- SECTION 7: CLEANUP TEST DATA ---');
  if (createdStudentId) {
    await adminSupabase.auth.admin.deleteUser(createdStudentId);
    console.log(`[CLEANUP] Deleted test student ${createdStudentId}`);
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
