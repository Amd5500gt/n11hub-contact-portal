# N11HUB Contact & Support Desk

Production-ready, lightweight contact and support web service for **N11HUB** (`https://contact.n11hub.in`).

---

## 🚀 Features

- **Focused Single-Page Architecture**: Zero clutter, no navbar, no footer, no unnecessary dashboards.
- **Vibrant & Clean Visuals**: Colorful ambient palette with glassmorphism card, subtle animations, and clean typography.
- **Full-Stack Express + React**: Vite frontend served together with secure Node.js Express backend.
- **Hostinger SMTP Integration**: Configured for `smtp.hostinger.com` over SSL (Port 465). The visitor's email is placed in `Reply-To` so hitting "Reply" in your inbox writes directly back to the visitor.
- **Enterprise-Grade Security**:
  - `Helmet` HTTP security headers.
  - Strict input sanitization & control character stripping (prevents SMTP header injection).
  - Anti-spam honeypot tarpit.
  - In-memory sliding rate limiting on `/api/contact`.
  - Request body size limiter (30KB).
  - Safe error masking (no stack traces, no credentials in logs or client responses).
- **SEO Ready**: Canonical URL (`https://contact.n11hub.in/`), OpenGraph, Twitter Cards, Schema.org `ContactPage` JSON-LD, `robots.txt`, and `sitemap.xml`.
- **Full Accessibility**: ARIA tags, live regions, labeled inputs, keyboard navigable, WCAG AA contrast.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend**: Node.js, Express, Nodemailer, Helmet, CORS, TSX
- **Build Tool**: Vite 8

---

## ⚙️ Environment Variables

Create a `.env` file in the project root (never commit `.env`):

```env
# Application Host
APP_URL="https://contact.n11hub.in"
PORT=3000

# Hostinger SMTP Configuration
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
SMTP_USER="support@n11hub.in"
SMTP_PASSWORD="YOUR_ACTUAL_HOSTINGER_PASSWORD"

# Support Ticket Recipient
CONTACT_TO="support@n11hub.in"
```


---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server with Vite HMR + Express
npm run dev
```

The app will be running at `http://localhost:3000`.

---

## 📦 Production Build & Run

```bash
# 1. Build the frontend client assets into /dist
npm run build

# 2. Start the production server
npm start
```

In production mode (`NODE_ENV=production`), `server.ts` statically serves the optimized bundle in `/dist` and serves `/api/contact` on port `3000` (or `process.env.PORT`).

---

## 🌐 DNS Configuration for `contact.n11hub.in`

To map the domain to your server:

1. **A Record** (Direct VPS / Dedicated Server):
   - **Type**: `A`
   - **Name / Host**: `contact`
   - **Value**: `<Your-Server-Public-IPv4>`
   - **TTL**: `300` or `Automatic`

2. **CNAME Record** (PaaS / Cloud Run / Vercel / Render / Heroku):
   - **Type**: `CNAME`
   - **Name / Host**: `contact`
   - **Value**: `<your-deployment-cname-target>` (e.g. `hosting-service.com`)
   - **TTL**: `300`

3. **Mail DNS Verification (Hostinger)**:
   Ensure your root domain `n11hub.in` has valid MX, SPF, and DKIM records in your DNS manager:
   - **MX 1**: `mx1.hostinger.com` (Priority 5)
   - **MX 2**: `mx2.hostinger.com` (Priority 10)
   - **SPF TXT**: `v=spf1 include:_spf.mail.hostinger.com ~all`
   - **DKIM TXT**: Configured via Hostinger Email Control Panel

---

## 📧 Hostinger SMTP Setup Instructions

1. Log into your **Hostinger hPanel**.
2. Go to **Emails** &rarr; select **n11hub.in**.
3. Confirm that the mailbox **`support@n11hub.in`** is active.
4. If you don't know the password or need an app password, click **Change Password** or create a dedicated application password.
5. In your production environment settings (or `.env` file), supply:
   ```env
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=support@n11hub.in
   SMTP_PASSWORD=<YOUR_PASSWORD>
   CONTACT_TO=support@n11hub.in
   ```

---

## 🔒 Security Best Practices Implemented

1. **Zero Secret Leaks**: The frontend never receives, imports, or bundles SMTP passwords.
2. **Header Injection Prevention**: Any newlines (`\r`, `\n`) in `name`, `email`, and `subject` are sanitized before reaching Nodemailer.
3. **Reply-To Safety**: Outgoing emails originate from `support@n11hub.in` (SPF/DKIM compliant), with the visitor's address set in `Reply-To`.
4. **Rate Limiting**: Limits requests per IP to 5 submissions per 15 minutes, with minimum 3-second gaps between consecutive submissions.
5. **Honeypot Anti-Spam**: Invisible field traps automated bots with a silent tarpit.
