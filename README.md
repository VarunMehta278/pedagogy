# Pedagogy

A centralised technical event management system for colleges.

Pedagogy runs the whole life of a campus event in one place — from the
moment a faculty member drafts it to the moment a winner downloads a
certificate that anyone can verify. No spreadsheets for registrations, no
paper list at the door, no WhatsApp thread for results.

---

## The problem

Running a hackathon or a technical fest at a college usually means five
disconnected tools: a Google Form for registrations, a spreadsheet for
attendance, a WhatsApp group for announcements, a judge with a notebook,
and somebody in Canva at 2am making certificates. Nothing reconciles.
Nobody can prove who actually attended. Certificates are unverifiable.

Pedagogy closes that loop:

```mermaid
flowchart LR
  A[Faculty drafts event] --> B[Student registers]
  B --> C[QR code issued]
  C --> D[Volunteer scans at venue]
  D --> E[Judge scores against criteria]
  E --> F[Results published]
  F --> G[Certificate issued]
  G --> H[Public verification]
```

Every step writes to the same database, so attendance is provable, scores
are auditable, and a certificate carries a code that a recruiter can check
without an account.

---

## Features

### Five roles, each with its own workspace

| Role | What they do |
|---|---|
| **Student** | Browse and register for events, get a QR pass, form or join teams, track registrations, download certificates |
| **Faculty** | Create and run events, see every colleague's events (including drafts), manage their own participants, scan attendance, record results, issue certificates |
| **Judge** | See only the events they are assigned to, score participants or teams against weighted criteria, revise their own scores until results are finalised |
| **Volunteer** | Scan QR codes to check people in at the events they are assigned to — nothing else |
| **Admin** | Manage users and roles, oversee all events, view analytics |

Public signup **always** creates a student. Faculty, judge, volunteer and
admin roles are granted by an admin — there is deliberately no
self-service path to a privileged role.

### Events

- Draft → published → ongoing → completed → cancelled lifecycle
- Categories, venue, timing, participant limits, registration deadlines
- Drafts are visible to faculty and admins, invisible to students
- Capacity enforced at the database level, so a race between two
  simultaneous registrations cannot oversell an event

### Teams

- Per-event configuration: individual, or teams with a min and max size
- Students register first, then create or join a team with a share code
- Leader controls: rename, remove members, disband
- Teams are judged **once**, not once per member
- Faculty see which registered students have no team yet
- Individual events are completely untouched by any of this

### QR attendance

- Every registration gets a unique code rendered as a QR pass
- Faculty and assigned volunteers scan with a phone camera
- A repeat scan returns a clean "already checked in", not an error
- One attendance row per registration, enforced by a unique index

### Judging

- Faculty define weighted criteria per event, each with a max score
- Multiple judges per event; scores aggregate as a plain average, and a
  judge who has not scored counts as absent rather than as a zero
- Judges see only their assigned events — an unassigned event returns
  **404, not 403**, so the API cannot be used to enumerate what exists
- Results can be finalised, which closes evaluation

### Certificates

- Winner and participation certificates generated as PDFs
- Team wins fan out to one certificate per member
- Each carries a unique code and a **public verification page** — no
  login needed to confirm a certificate is real

### Also

- In-app notifications and per-event announcements
- Admin analytics with charts
- Light and dark themes
- Responsive down to phone width, which matters because volunteers scan
  on their phones

---

## Technologies

### Frontend

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Base UI |
| Motion | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| QR | `html5-qrcode` (scanning), `qrcode` (generation) |
| Misc | next-themes, sonner, lucide-react |

### Backend

| | |
|---|---|
| Runtime | Node.js 22, CommonJS |
| Framework | Express 5 |
| Language | TypeScript 5.9.3 (pinned) |
| Database | PostgreSQL 17 via Supabase |
| Auth | JWT in an httpOnly cookie, bcrypt (cost 12) |
| PDFs | PDFKit |
| Tests | `node:test` + ts-node |

### Hosting

Frontend on Vercel, API on Render, database on Supabase.

---

## Repository layout

This is a **two-app repository**. There is no root `package.json` — each
app is installed and built from its own directory.

```
pedagogy/
├── client/                  Next.js frontend
│   ├── app/                 App Router pages, one folder per role
│   ├── components/          UI primitives, layout, event components
│   └── lib/                 auth/session helpers, utilities
├── server/                  Express API
│   ├── src/
│   │   ├── config/          Supabase client, cookie options
│   │   ├── controllers/     Request handlers
│   │   ├── middleware/      auth, role checks, event access, rate limit
│   │   ├── routes/          Route definitions
│   │   ├── services/        Certificates, notifications, teams
│   │   └── utils/           Pure logic — scoring, teams, password, errors
│   ├── migrations/          Incremental SQL migrations (001–005)
│   └── tests/               Unit tests for the pure logic
└── supabase/
    └── migrations/          Full schema snapshot
```

---

## Getting started

### Prerequisites

- Node.js 20 or newer (developed on 22)
- A Supabase project (free tier is fine)

### 1. Clone and install

```bash
git clone <your-repo-url> pedagogy
cd pedagogy

cd server && npm install
cd ../client && npm install
```

### 2. Set up the database

In your Supabase project, open **SQL Editor** and run, in order:

1. `supabase/migrations/20260912145914_remote_schema.sql` — the full
   schema snapshot. This already includes migrations 001–004.
2. `server/migrations/005_evaluation_upsert_indexes.sql`

The numbered files in `server/migrations/` are kept for history and for
applying changes incrementally to an existing database. Every one of them
is idempotent, and `003` refuses to run if it would have to discard data —
it names the offending rows instead.

### 3. Configure the API

```bash
cd server
cp .env.example .env
```

Fill in `.env`:

| Variable | What it is |
|---|---|
| `PORT` | Port the API listens on (the client defaults to `5001`) |
| `JWT_SECRET` | Long random string for signing sessions. Generate with `openssl rand -base64 48` |
| `SUPABASE_URL` | Your project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only**, never expose to the browser |
| `FRONTEND_URL` | Allowed browser origin(s), comma-separated, no trailing slash |
| `NODE_ENV` | Leave unset locally. Set to `production` when deployed |

`.env` is gitignored and must stay that way.

### 4. Configure the frontend

```bash
cd client
echo 'NEXT_PUBLIC_API_URL=http://localhost:5001/api' > .env.local
```

### 5. Run both

Two terminals:

```bash
cd server && npm run dev     # http://localhost:5001
cd client && npm run dev     # http://localhost:3000
```

Check the API is alive at `http://localhost:5001/api/health`.

### 6. Create your first admin

Signup always creates a student, so promote yourself once by hand. Register
through the UI, then in the Supabase SQL Editor:

```sql
update users set role = 'admin' where email = 'you@example.com';
```

Sign out and back in. From then on you can grant faculty, judge and
volunteer roles from **Admin → Users**.

---

## API overview

All routes are under `/api`. Authentication is a JWT in an httpOnly
cookie, so every request from the browser uses `credentials: "include"`.

| Prefix | Purpose |
|---|---|
| `/api/auth` | Register, login, logout |
| `/api/users` | Current user, profile, role management |
| `/api/events` | Public listing, event detail, management, participants, attendance, results, judges, volunteers, criteria |
| `/api/registrations` | Register for an event, a student's own registrations |
| `/api/teams`, `/api/events/:id/teams` | Team creation, joining, roster |
| `/api/certificates` | Generation, download, public verification |
| `/api/notifications` | In-app notifications |
| `/api/judge` | A judge's assigned events and evaluations |
| `/api/volunteer` | A volunteer's assigned events and scanning |
| `/api/admin` | User management, event oversight, analytics |
| `/api/health` | Liveness check |

---

## Testing

```bash
cd server && npm test
```

49 tests across scoring, team rules, password policy, rate limiting,
ordinals and database error classification.

The suite covers the **pure logic** in `src/utils/` only — no test
constructs a Supabase client, so it runs with no network and no
credentials. The convention is deliberate: to make something testable,
extract it to `utils/` rather than reaching into a controller.

---

## Deployment

| | Root directory | Build | Start |
|---|---|---|---|
| **Vercel** (frontend) | `client` | `npm run build` | automatic |
| **Render** (API) | `server` | `npm install && npm run build` | `npm start` |

Set the root directory on both platforms — there is no root
`package.json`, so a blank root directory fails immediately.

Two environment variables on Render are load-bearing and easy to miss:

- **`NODE_ENV=production`** — switches the session cookie to
  `SameSite=None; Secure`, which is what allows the browser to send it to
  the API from the frontend's domain. The two are on different sites in
  production, so without this every authenticated request fails with 401.
- **`FRONTEND_URL`** — the exact frontend origin, no trailing slash. The
  CORS check is an exact match; a mismatch means no CORS headers, which
  the browser reports as `TypeError: Failed to fetch`.

`server/.npmrc` sets `include=dev` so that build-time dependencies
(TypeScript and the `@types/*` packages) are installed even though hosts
set `NODE_ENV=production`, which otherwise makes npm skip them.

---

## Engineering notes

A few decisions that aren't obvious from the feature list.

**Every duplicate guard is a database constraint, not a check.** The
original code did `check if exists → insert`, which two concurrent
requests both pass. Only the database can stop the second write, so
duplicate registrations, QR codes, attendance rows, certificates and
evaluations are each backed by a unique index, and the API translates
SQLSTATE 23505 into a meaningful response — a repeat registration is a
409, a repeat scan returns the same "already checked in" as the first one,
a double-clicked certificate button returns the existing certificate.

**Capacity is enforced by a trigger that locks the event row.**
`SELECT participant_limit FROM events WHERE id = ... FOR UPDATE` before
counting, so two people taking the last seat at the same instant cannot
both succeed.

**Authorization is two layers.** A coarse role filter that re-reads the
role from the database rather than trusting a week-old token, then a
per-resource check: faculty must own the event, judges must be assigned to
it, volunteers must be assigned to it. Faculty can *see* every event but
can only *change* their own, and that distinction is enforced server-side
on every mutating route — the client flag is an affordance, not a gate.

**Unassigned events return 404, not 403.** A 403 confirms the resource
exists; a 404 tells an attacker nothing.

**Sessions are fetched once per tab.** Collapsing "signed out" and
"couldn't reach the API" into one value caused a redirect loop between
guarded pages and the login page. The session now has three states and is
shared, so two components cannot disagree about who is signed in.

---

## Security

- Passwords hashed with bcrypt at cost 12
- JWT in an httpOnly cookie — never in localStorage, never readable by JS
- `Secure` and `SameSite=None` in production, `Lax` over localhost
- Identical `Invalid email or password` on both login failure branches, so
  the API cannot be used to discover which emails are registered
- Rate limiting on login and registration, keyed per client IP
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses row-level
  security — it must never reach the frontend bundle
- The API refuses to start if `JWT_SECRET` is missing

---

## Author

Built by **Varun Mehta** & **Dewik Bavishi**
