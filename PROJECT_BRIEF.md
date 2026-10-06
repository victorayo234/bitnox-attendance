STACK
- Next.js (App Router) + TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row Level Security), html5-qrcode for scanning, date-fns and date-fns-tz for time, Lucide icons, deployed on Vercel. No separate backend.
- Mobile-first, fast, responsive. Students use phones.

BRAND (match Bitnox exactly)
- Font: Inter (400, 500, 600, 700) via next/font.
- Colors: primary navy #0B1B3F (buttons, headings); muted text #5E6C87; border #DDE3EE; soft background #F1F4FB; page background #FFFFFF; footer/subtle background #F5F8FE; accent cyan #00E6FF (logo and small highlights ONLY, never text on white). Status: present #16A34A, late #F59E0B, absent/error #EF4444.
- Style: pill-shaped buttons, rounded cards (16px) with thin #DDE3EE borders, outline Lucide icons, generous white space, clean and minimal. Use the attached logo (save to /public/images/bitnox-logo.png) in headers and on landing/login pages. Use the attached screenshot only as visual reference.

ROLES
- Two roles: student and admin. One website. Landing page has two buttons: Student Login and Admin Login. Both use the same login system. Role comes from the profiles table. No public sign-up. Admin creates student accounts.

DAILY RULES (all times Africa/Lagos, decided on the SERVER clock, never the phone)
- Check-in window gate: from 08:00 to 12:00, a student with no check-in today sees a full-screen, non-dismissible pop-up "Scan your attendance" and cannot reach the dashboard until they scan the CHECK IN code.
- Check-in after 08:30 is saved with status "late"; at or before 08:30 it is "present". Check-in before 08:00 is allowed (present).
- After 12:00 with no check-in: no blocking pop-up, but a banner and a Scan button; check-in is still allowed and is marked late.
- Check-out is allowed only from 12:00 onward, only after a check-in, and only with the CHECK OUT code.
- During the gate window the CHECK OUT code must be rejected with "Wrong code. Please scan the CHECK IN code."
- Before 12:00 with a check-in already done, the OUT code is rejected with "Check-out opens at 12:00 p.m."
- One record per student per day (unique on student_id + attendance_date). Double check-in and double check-out are rejected with friendly messages.
- Workdays are Monday to Friday (configurable constant).

QR CODES
- Two printed static QR codes: IN and OUT. Each encodes a secret string (env vars QR_IN_SECRET and QR_OUT_SECRET). The scanner accepts either the raw string or a URL containing ?code=SECRET. The server compares with a constant-time comparison. Secrets never reach the client bundle.

MESSAGES
- Check-in success: "Good Morning, {first name}! Welcome back to Bitnox." (use "Good Afternoon" if after 12:00).
- Check-out success: "Goodnight, {first name}! See you tomorrow."

SECURITY PRINCIPLES
- All attendance writes happen server-side with the service role key. Students never write directly to the database. Service role key is server-only. Role checks happen on the server in layouts and API routes, not just by hiding buttons. RLS enabled on every table.

ENV VARS: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, QR_IN_SECRET, QR_OUT_SECRET.
