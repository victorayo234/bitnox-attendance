# Bitnox Attendance System

A production-grade, mobile-first student attendance tracking web application purpose-built for the Bitnox Technology learning hub in Abeokuta, Nigeria.

---

## 1. Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Custom Bitnox Design Tokens (Navy `#0B1B3F`, Accent Cyan `#00E6FF`)
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, Database Triggers)
- **Time Engine**: `date-fns` & `date-fns-tz` pinned to `Africa/Lagos` timezone
- **QR Code Engine**: `html5-qrcode` (client scanner) & `qrcode` (server-side vector generation)
- **Testing**: Vitest & Playwright

---

## 2. Directory Structure

```
bitnox-attendance/
├── public/                     # Static assets (Bitnox brand logo, PWA icons)
├── scripts/                    # Automated integration & verification test scripts
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── admin/              # Admin dashboard, approvals, QR codes, students, weekly matrix
│   │   ├── api/
│   │   │   ├── admin/          # Admin APIs (attendance, student management, role change)
│   │   │   └── attendance/     # Student scan processing endpoint (/api/attendance/scan)
│   │   ├── login/              # Role-aware login portal (/login?role=student | admin)
│   │   ├── pending/            # Dedicated waiting screen for unapproved/rejected students
│   │   ├── scan/               # Direct QR link handler (/scan?code=...)
│   │   ├── signup/             # Student self-enrollment portal
│   │   ├── student/            # Student dashboard, ScanGate overlay, weekly view
│   │   ├── layout.tsx          # Root layout with Inter font and metadata
│   │   └── page.tsx            # Landing page with student and admin entrances
│   ├── components/             # Reusable UI & domain components
│   │   ├── ui/                 # Atomic design components (Button, Card, Badge)
│   │   ├── AdminAttendanceConsole.tsx # Live attendance dashboard
│   │   ├── AdminQrPrintView.tsx       # A4 print-optimized QR generator
│   │   ├── QrScanner.tsx              # html5-qrcode camera viewfinder
│   │   ├── ScanGate.tsx               # Full-screen mandatory check-in gate
│   │   └── SuccessPopup.tsx           # Scan confirmation modal
│   ├── lib/                    # Business logic and server services
│   │   ├── actions/auth.ts     # Server actions for login, signup, and logout
│   │   ├── attendance-rules.ts # Pure business rules for attendance windows and gate state
│   │   ├── attendance-scan.ts  # Atomic scan processing and database transactions
│   │   ├── qr-utils.ts         # Constant-time comparison and rate limiting
│   │   └── supabase/           # Supabase client factories (server, admin, client, middleware)
│   └── types/                  # TypeScript interface declarations
├── supabase/
│   └── migrations/             # Idempotent PostgreSQL migration files
├── tests/                      # Playwright E2E test specs
└── HANDOVER.md                 # Non-technical administrator operations manual
```

---

## 3. Environment Variables

Create a `.env.local` file in the project root. Never commit this file or hardcode credentials.

| Variable Name | Exposure | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Supabase project API URL (e.g. `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Supabase Anonymous Key used for client-side queries guarded by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only (Secret)** | Elevated service key used exclusively in server routes for atomic writes and admin ops. |
| `QR_IN_SECRET` | **Server-Only (Secret)** | Secret token embedded in the physical CHECK IN QR code. |
| `QR_OUT_SECRET` | **Server-Only (Secret)** | Secret token embedded in the physical CHECK OUT QR code. |

---

## 4. Local Development

### Prerequisites
- Node.js 20+
- npm or pnpm

### Setup
```bash
# Clone repository
git clone https://github.com/victorayo234/bitnox-attendance.git
cd bitnox-attendance

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Running Tests

```bash
# Run Vitest unit & integration test suite (58 tests)
npm test

# Run type check & production build verification
npm run build
```

To run individual verification scripts against a running dev server:
```bash
node scripts/test-scan-api.js
node scripts/test-roles-and-security.js
node scripts/test-admin-console.js
```

---

## 6. Database Migrations

Database migrations are stored in `supabase/migrations/`:
1. `001_init.sql`: Core schema (`profiles`, `attendance`), indexes, and RLS policies.
2. `002_student_enrollment.sql`: Enrollment status (`pending`, `approved`, `rejected`).
3. `003_auth_trigger_and_role_changes.sql`: `role_changes` audit table and security-definer trigger `handle_new_user()` on `auth.users`.

Apply migrations using the Supabase CLI or SQL Editor:
```bash
supabase db push
# or paste the migration SQL directly into the Supabase Dashboard SQL Editor
```

---

## 7. Architectural & Security Rules

1. **Server Clock Authority**:
   - All attendance logic, status evaluations, and calendar dates are computed strictly on the server clock using the `Africa/Lagos` timezone. Client clocks are ignored.
2. **Server-Side Writes Only**:
   - Students have zero write permissions in PostgreSQL. All attendance records and profile state changes are written server-side using `createAdminClient()`.
3. **Strict Row-Level Security (RLS)**:
   - Enabled on `profiles`, `attendance`, and `role_changes`. Students can only SELECT their own record; admins can query all.
4. **Trigger-Enforced Role Security**:
   - Self-registration on `auth.users` triggers `handle_new_user()`, which strictly hardcodes `role='student'` and `status='pending'`. Any user metadata attempting to forge `role='admin'` is discarded.
5. **On-Demand QR Code Rendering**:
   - QR codes are generated dynamically on the server at `/admin/qr` as data URLs. Raw secrets are never sent as plain text or saved as image files in the repository.
6. **No Secrets in Repo**:
   - `.env.local` is ignored in `.gitignore`. Production secrets reside solely in the Vercel Project Settings.
