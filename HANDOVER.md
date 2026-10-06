# Bitnox Attendance — Administrator & Hub Owner Guide

Welcome to the **Bitnox Attendance System**. This guide is written in plain English to help hub administrators run daily attendance smoothly and manage students and staff.

---

## 1. Daily Attendance Rules (Africa / Lagos Time)

The system operates strictly on the official Lagos clock:

1. **Check-in Gate (08:00 AM – 12:00 PM)**:
   - When students open the web app, they see a full-screen screen requiring them to scan the **CHECK IN** QR code. They cannot enter the dashboard until they scan.
   - **On Time (Present)**: Scanning at or before **11:59 AM** marks the student **Present** (green).
2. **After 12:00 PM (Late Check-in)**:
   - The full-screen pop-up clears, but late check-in remains available. Any check-in from **12:00 PM onward** is saved as **Late** (amber).
3. **Check-out Window (12:00 PM onward)**:
   - Check-out opens at **12:00 PM**.
   - Students must have checked in earlier that day, and must scan the **CHECK OUT** QR code.
   - The CHECK OUT code is rejected before 12:00 PM.
4. **One Record Per Day**:
   - Each student can record at most one check-in and one check-out per day. Duplicate scans are blocked automatically.

---

## 2. Daily Admin Tasks

### A. Logging in as Admin
1. Open the website on your browser: `https://[your-app-domain].vercel.app/login?role=admin`.
2. Enter your administrator email and password.
3. Click **Sign in**. You will land on the Admin Dashboard (`/admin`).

### B. Reading the Dashboard
At the top of `/admin`, you will see 4 live metric cards:
- **Active Students**: Total number of registered, approved students.
- **Currently In**: Students who scanned in today and have not yet scanned out.
- **Checked Out**: Students who completed their day by scanning out.
- **Not Yet In**: Active students who have not scanned in today.

The table below lists all students for the day with their check-in time, check-out time, and status badge. You can use the search bar or filter buttons (**All**, **In**, **Out**, **Not yet in**, **Late**) to find specific students.

### C. Approving or Rejecting Student Sign-Ups
When new students register on the website, they cannot access the system until approved:
1. Click **Approvals** in the top navigation bar (`/admin/approvals`).
2. You will see all students waiting for enrollment review.
3. Verify the student's name and email.
4. Click **Approve** to activate their account, or **Reject** if they are not recognized.
5. Once approved, the student's phone automatically redirects to their attendance dashboard within 30 seconds.

### D. Marking Attendance Manually (If a Student's Phone or Camera Fails)
If a student forgets their phone, has low battery, or camera issues:
1. Go to `/admin`.
2. Find the student in the table.
3. Click **Mark present** (or **Mark checked out** in the afternoon).
4. Confirm the prompt. The record will be updated immediately with a small **manual** badge for transparency.
5. If an accidental entry was made, click **Clear record** to reset that student's status for the day.

### E. Viewing Weekly Attendance
1. Click **Weekly** in the navigation bar (`/admin/weekly`).
2. Use the **Previous Week** and **Next Week** buttons to browse past weeks.
3. The matrix shows Monday to Friday for every student:
   - **P** (Green) = Present
   - **L** (Amber) = Late
   - **A** (Red) = Absent
4. Click any student's name to open their individual history profile (`/admin/students/[id]`).

---

## 3. Student & Staff Management

### A. Adding a Student Directly
1. Click **Students** in the navigation bar (`/admin/students`).
2. Click **Add student**.
3. Type their Full Name, Email, and a temporary password (minimum 8 characters).
4. Click **Create Student**. The student is created already approved and can log in immediately.

### B. Deactivating a Student
If a student leaves Bitnox or pauses their enrollment:
1. Go to `/admin/students`.
2. Find their row and click **Deactivate**.
3. Deactivated students are immediately blocked from logging in, scanning, and appearing in daily counts. You can click **Reactivate** at any time.

### C. Making Another Admin & Removing Admins
> **IMPORTANT WARNING**: Grant admin privileges **ONLY** to people you trust completely. Admins have full access to attendance records, student details, and QR codes.

1. Go to `/admin/students`.
2. Locate the student you wish to promote (they must be an active, approved student).
3. Click **Make admin** and confirm.
4. To remove an admin, click **Remove admin** on their row.
   *(Note: The system mathematically prevents removing the last remaining admin, ensuring the hub is never locked out.)*

---

## 4. Attendance QR Codes (`/admin/qr`)

### Where to Find & Print the Codes
1. Log in as admin and visit `/admin/qr` in your browser.
2. You will see two large cards:
   - **CHECK IN** (placed at the entrance welcome table)
   - **CHECK OUT** (placed near the exit)
3. Click the **Print QR Codes** button.
   - The print stylesheet automatically formats each QR code onto its own separate A4 page with high-contrast black borders and instructions.
4. Print in high quality and laminate both pages. Keep one spare printed copy in the hub office.
5. **Always test scan both printed sheets** with the mobile camera before mounting them on the wall.

### How to Rotate / Change the QR Secrets
If you suspect someone took a photo of the QR code to scan from home:
1. Open your **Vercel Project Dashboard** (`vercel.com`).
2. Go to **Settings** → **Environment Variables**.
3. Edit `QR_IN_SECRET` and `QR_OUT_SECRET` with new random text strings (e.g., generated at `passwordsgenerator.net`).
4. Click **Save** on both.
5. Go to the **Deployments** tab in Vercel, click the three dots (`...`) on the latest deployment, and click **Redeploy**.
6. Once redeployed, log into `/admin/qr`, print the new QR codes, mount them up, and destroy the old printouts.

---

## 5. Account Ownership & Handover

The following accounts manage the live service:

| Service | Purpose | Primary Contact / Owner |
|---|---|---|
| **Supabase** | Live database, authentication, backups | [Owner Account / Email Placeholder] |
| **Vercel** | Web hosting, domain routing, SSL certificate | [Owner Account / Email Placeholder] |
| **GitHub** | Code repository and deployment pipeline | [Owner Account / Email Placeholder] |
| **Domain Registrar** (if custom) | DNS and custom domain mapping | [Owner Account / Email Placeholder] |

### Handover Steps for New Hub Owner
1. The new owner creates a student account on the site (`/signup`).
2. Current admin approves the account at `/admin/approvals`.
3. Current admin clicks **Make admin** on the new owner's row at `/admin/students`.
4. New owner logs into `/admin` and verifies access.
5. New owner clicks **Remove admin** on the outgoing admin's row (or deactivates the outgoing account).
6. Transfer or invite the new owner to the GitHub repository, Vercel team, and Supabase project.

---

## 6. If Something Breaks

If the application displays an error or students cannot scan:

1. **Camera Not Opening**:
   - Ensure the student allowed camera permissions in their phone browser (tap the lock icon in Safari or Chrome address bar → allow Camera → reload).
   - Ensure the site is accessed over `https://` (camera APIs require HTTPS).
2. **Clock or Time Issues**:
   - The application uses the server's official Africa/Lagos clock. Changing phone time does not bypass rules.
3. **Emergency Manual Attendance**:
   - The admin can mark all students present or checked out directly from `/admin`.

### Technical Support Contact
- **Developer Name**: [Victor Ayoade / Developer Name Placeholder]
- **Phone / WhatsApp**: [Developer Phone Placeholder]
- **Email**: [Developer Email Placeholder]
