import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();

// Security middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false, // Permitted for iframe preview
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// Payload size limit to prevent buffer overflow attacks
app.use(express.json({ limit: '30kb' }));

// In-memory sliding rate limiter & anti-spam
interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const MIN_INTERVAL_BETWEEN_REQUESTS_MS = 3000; // 3 seconds between successive calls

// Periodic garbage collection for rate limit map
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Helper to escape HTML to prevent XSS in email client
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sanitization: strip newline & carriage returns to prevent SMTP header injection
function sanitizeHeader(str: string): string {
  return str.replace(/[\r\n\x00-\x1F\x7F]+/g, ' ').trim();
}

// Email format regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Contact form submission endpoint
app.post('/api/contact', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. IP identification & rate limiting
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const existingRecord = rateLimitMap.get(clientIp);

    if (existingRecord) {
      // Check minimum interval to prevent rapid automated duplicate clicks
      if (now - existingRecord.lastRequestTime < MIN_INTERVAL_BETWEEN_REQUESTS_MS) {
        res.status(429).json({
          success: false,
          message: 'Please wait a few seconds before submitting again.',
        });
        return;
      }

      // Check window expiration
      if (now - existingRecord.firstRequestTime < RATE_LIMIT_WINDOW_MS) {
        if (existingRecord.count >= MAX_REQUESTS_PER_WINDOW) {
          res.status(429).json({
            success: false,
            message: 'Too many submissions from this connection. Please try again later.',
          });
          return;
        }
        existingRecord.count += 1;
        existingRecord.lastRequestTime = now;
      } else {
        // Reset window
        rateLimitMap.set(clientIp, {
          count: 1,
          firstRequestTime: now,
          lastRequestTime: now,
        });
      }
    } else {
      rateLimitMap.set(clientIp, {
        count: 1,
        firstRequestTime: now,
        lastRequestTime: now,
      });
    }

    // 2. Anti-spam honeypot detection
    // If the hidden field is filled, silently simulate success to fool spam bots
    if (req.body._website || req.body.botCheck) {
      res.status(200).json({
        success: true,
        message: 'Message sent successfully.',
      });
      return;
    }

    // 3. Extract and validate parameters
    const { name, email, subject, message } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Your name is required.' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ success: false, message: 'A valid email address is required.' });
      return;
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      res.status(400).json({ success: false, message: 'A subject is required.' });
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, message: 'A message is required.' });
      return;
    }

    // Length sanity checks
    const cleanName = sanitizeHeader(name).slice(0, 100);
    const cleanEmail = sanitizeHeader(email).slice(0, 150);
    const cleanSubject = sanitizeHeader(subject).slice(0, 200);
    const cleanMessage = message.trim().slice(0, 5000);

    if (cleanName.length < 2) {
      res.status(400).json({ success: false, message: 'Please enter a valid full name.' });
      return;
    }
    if (cleanSubject.length < 2) {
      res.status(400).json({ success: false, message: 'Subject must be at least 2 characters.' });
      return;
    }
    if (cleanMessage.length < 5) {
      res.status(400).json({ success: false, message: 'Message must be at least 5 characters.' });
      return;
    }

    // 4. SMTP Configuration
    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const smtpUser = process.env.SMTP_USER || 'support@n11hub.in';
    const smtpPassword = process.env.SMTP_PASSWORD;
    const recipientEmail = process.env.CONTACT_TO || 'support@n11hub.in';

    // Verify SMTP Password existence
    if (!smtpPassword) {
      // Password not yet configured in environment
      console.warn(
        '[N11HUB Support API] SMTP_PASSWORD environment variable is not set. Emails cannot be dispatched until SMTP_PASSWORD is provided in .env.'
      );
      res.status(503).json({
        success: false,
        message: 'Unable to send your message right now. Please try again.',
      });
      return;
    }

    // 5. Initialize Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // SSL on port 465
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        // Enforce safe minimum TLS
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000, // 10s
    });

    const timestampIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // 6. Build email content
    const textBody = `New Contact Form Submission - N11HUB Support
--------------------------------------------------
Time: ${formattedDate} (${timestampIso})
Name: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}

Message:
${cleanMessage}

--------------------------------------------------
Reply directly to this email to contact the visitor (${cleanEmail}).
Submitted via https://contact.n11hub.in
`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 24px 28px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 28px; }
    .field-group { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .value { font-size: 15px; color: #0f172a; font-weight: 500; }
    .message-box { background: #f1f5f9; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; }
    .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>N11HUB &bull; New Support Inquiry</h1>
      <p>Submitted via contact.n11hub.in</p>
    </div>
    <div class="body">
      <div class="field-group">
        <div class="label">Sender Name</div>
        <div class="value">${escapeHtml(cleanName)}</div>
      </div>
      <div class="field-group">
        <div class="label">Sender Email</div>
        <div class="value"><a href="mailto:${escapeHtml(cleanEmail)}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(cleanEmail)}</a></div>
      </div>
      <div class="field-group">
        <div class="label">Subject</div>
        <div class="value">${escapeHtml(cleanSubject)}</div>
      </div>
      <div class="field-group">
        <div class="label">Submission Time</div>
        <div class="value" style="font-size: 13px; color: #475569;">${escapeHtml(formattedDate)}</div>
      </div>
      <div class="field-group" style="margin-bottom: 0;">
        <div class="label">Message Content</div>
        <div class="message-box">${escapeHtml(cleanMessage)}</div>
      </div>
    </div>
    <div class="footer">
      Hit "Reply" to write directly to <strong>${escapeHtml(cleanEmail)}</strong>
    </div>
  </div>
</body>
</html>
`;

    // 7. Send the email
    await transporter.sendMail({
      from: `"N11HUB Support Form" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: cleanEmail,
      subject: `[N11HUB Support] ${cleanSubject}`,
      text: textBody,
      html: htmlBody,
    });

    res.status(200).json({
      success: true,
      message: 'Message sent successfully.',
    });
  } catch (error: any) {
    // Log safe error without printing credentials
    console.error('[N11HUB Support API] Error sending contact email:', error?.message || 'Unknown error');
    // Safe generic response to client
    res.status(500).json({
      success: false,
      message: 'Unable to send your message right now. Please try again.',
    });
  }
});

// Setup dev server with Vite or production static serving
async function startServer() {
  if (!isProd) {
    console.log('Initializing Vite development server...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
