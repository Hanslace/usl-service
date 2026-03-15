# USL — Unified Signup Login

> A drop-in, hosted authentication frontend you point your app at instead of building auth yourself.

**Built by Haseeb Alvi** · Next.js 15 · Redis · Nodemailer · Google OAuth

---

## The idea

Auth is the same problem every app solves from scratch. USL solves it once and lets any number of apps share it.

You redirect your users to USL. USL handles the full signup/login sequence — OTP verification, account creation, password setup, forgot password, Google OAuth — then redirects back to your app with an authorization code, exactly like OAuth. Your backend exchanges that code for whatever session or token it wants. USL never touches your tokens.

**One hosted USL instance can serve as many apps as you want.** Each app registers a `client_id` and gets its own isolated session and redirect flow.

---

## What USL gives you out of the box

- **OTP-first identity** — users sign in with email or phone. No username required.
- **Automatic new vs. returning detection** — USL checks your backend after OTP verification and branches the flow automatically. No logic on your end.
- **Full registration flow** — collects both email and phone from new users, verifies both, then sets up a password.
- **Forgot password** — OTP-verified reset, fully self-contained.
- **Google OAuth** — optional. Drop in credentials to enable it, leave them out to disable.
- **Stateful back-navigation** — every "← Back" button rolls the session back correctly without re-running side effects.
- **OTP security** — codes are SHA-256 hashed at rest, 5-attempt lockout per code, per-user resend cooldown.
- **Multi-app ready** — register as many `client_id`s as you need in Redis. Each gets an independent session space.

---

## How the flow works

```
Your app                      USL                        Your backend
   │                           │                              │
   │  1. redirect to /authorize│                              │
   │─────────────────────────▶ │                              │
   │                           │  2. create session           │
   │                           │     set cookie               │
   │                           │     redirect to /            │
   │                           │                              │
   │         [user completes signup or login on USL]          │
   │                           │                              │
   │                           │  3. POST to your backend ───▶│
   │                           │◀─────────────────── { code } │
   │                           │                              │
   │  4. redirect to your app  │                              │
   │◀─ ?code=...&state=...──── │                              │
   │                           │                              │
   │  5. exchange code ──────────────────────────────────────▶│
   │◀─ access_token / session ────────────────────────────────│
```

USL never issues tokens. It just delivers a one-time code to your redirect URI. Token issuance, session management, and any other identity logic stays entirely in your backend.

---

## Quickstart

### 1. Clone and install

```bash
git clone <repo>
cd usl
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# fill in REDIS_URL, MAIL_*, OTP_TTL_MS, etc.
```

### 3. Register your app as a client

USL looks up your backend URL from Redis using the `client_id` you pass on the authorize URL. Register it once:

```bash
redis-cli SET usl:client:my-app "https://api.yourapp.com"
```

### 4. Start USL

```bash
npm run dev
```

### 5. Send users to USL

Redirect your users to:

```
http://localhost:3000/authorize
  ?client_id=my-app
  &redirect_uri=https://yourapp.com/auth/callback
  &state=<random_csrf_token>
```

USL handles everything from there. When done, the user lands at:

```
https://yourapp.com/auth/callback?code=<code>&state=<your_state>
```

Exchange that `code` in your backend for a session or token.

---

## What your backend needs to implement

USL calls your backend at the URL registered above. Six endpoints, all `POST`, all under `/auth/identity/`.

Every endpoint that completes authentication must return `{ "code": "string" }`. That code is what USL passes back to your app.

---

### Check if a user exists

```
POST /auth/identity/existence
```

Called after the first OTP is verified. USL uses the response to decide whether to run the login flow or the registration flow.

```json
// request
{ "method": "email" | "phone", "identifier": "string" }

// response
{ "user_exists": true | false }
```

---

### Register a new user

```
POST /auth/identity/register
```

Called after a new user verifies both contact methods and sets a password.

```json
// request
{ "email": "string", "phone": "string", "password": "string" }

// response
{ "code": "string" }
```

---

### Log in an existing user

```
POST /auth/identity/login
```

Called after an existing user enters their password.

```json
// request
{ "method": "email" | "phone", "identifier": "string", "password": "string" }

// response
{ "code": "string" }
```

---

### Register via Google OAuth

```
POST /auth/identity/oauth-register
```

Called after a successful Google OAuth callback. Create or link the account as needed.

```json
// request
{ "provider": "google", "provider_user_id": "string", "email": "string" }

// response
{ "code": "string" }
```

---

### Get a user's alternate contact method

```
POST /auth/identity/alternate
```

Called during forgot-password to find which contact to send the reset OTP to.

```json
// request
{ "method": "email" | "phone", "identifier": "string" }

// response
{ "alt_method": "email" | "phone", "alt_identifier": "string" }
```

---

### Reset a user's password

```
POST /auth/identity/reset-password
```

Called after the forgot-password OTP is verified.

```json
// request
{ "method": "email" | "phone", "identifier": "string", "new_password": "string" }

// response
200 OK
```

---

## Environment variables

```bash
# Core
NODE_ENV=production
SERVICE_ID=usl                        # used in structured logs
REDIS_URL=redis://localhost:6379

# OTP
OTP_TTL_MS=300000                     # how long a code is valid (5 min default)
NEXT_PUBLIC_OTP_COOLDOWN_MS=120000    # resend lockout shown to the user (2 min default)

# Email (SMTP)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=you@example.com
MAIL_PASS=yourpassword
MAIL_FROM=noreply@example.com

# Google OAuth (optional — omit to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-usl-domain.com/api/oauth/callback
```

---

## Internals (if you need to go deeper)

<details>
<summary>Session state machine</summary>

USL tracks each user's position in Redis under `usl:session:{sessionId}`. The `step` field gates every API route.

```
identifier_entry
       │
       ▼
   otp_first
       │
   ┌───┴───────────────┐
   ▼                   ▼
register          password_login
   │                   │
   ▼               forgot_password
otp_second              │
   │               password_reset
   ▼
password_setup
```

`POST /api/back` performs stateful rollback — it rewinds the step and cleans up any pending OTPs atomically via a Redis multi/exec.

</details>

<details>
<summary>Redis key schema</summary>

| Key | TTL | What it holds |
|---|---|---|
| `usl:client:{client_id}` | permanent | Your backend URL |
| `usl:session:{sessionId}` | 30 min | Step, identifiers, redirect_uri, state |
| `usl:otp:{sessionId}` | `OTP_TTL_MS` | `{ otp_hash, attempts }` |
| `usl:otp:cooldown:{sessionId}:{method}:{identifier}` | `OTP_COOLDOWN_MS` | Resend lock |

</details>

<details>
<summary>Middleware</summary>

`src/proxy.ts` checks for a valid `usl_session_id` cookie on every page request. Missing or expired → redirect to `/session-expired`.

Exempt from the check: `/authorize`, `/session-expired`, `/api/*`, `/_next/*`.

</details>

---

## Pages

| Route | What it does |
|---|---|
| `/` | Email or phone entry + Google OAuth button |
| `/otp` | 6-digit code input with resend countdown |
| `/register` | Second contact method for new users |
| `/password/login` | Password entry for returning users |
| `/password/forgot` | OTP verification for password reset |
| `/password/reset` | New password form |
| `/password/setup` | First password creation for new users |
| `/session-expired` | Shown when the session cookie is gone |
| `/complete` | OAuth redirect completion handler |

---

## License

MIT
