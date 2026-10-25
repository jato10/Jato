/**
 * Contact form endpoint for the Global Beyond LLC site.
 *
 * Receives the form in the site's contact section and relays it by email
 * through Resend. Nothing about the destination address is exposed to the
 * browser: it lives only in the CONTACT_TO environment variable.
 *
 * Required environment variables (set in the Vercel project):
 *   RESEND_API_KEY  API key from resend.com
 *   CONTACT_TO      Address that receives the enquiries
 * Optional:
 *   CONTACT_FROM    Verified sender. Defaults to Resend's shared sender,
 *                   which only delivers to the Resend account owner.
 */

const LIMITS = { name: 120, email: 200, phone: 60, message: 4000 };

const LANGS = {
  en: {
    sent: '/en/message-sent/',
    subject: 'New enquiry from the website',
    labels: { name: 'Name', email: 'Email', phone: 'Phone / WhatsApp', message: 'Message' },
    errors: {
      method: 'Method not allowed.',
      missing: 'Please add your name, a way to reach you, and a message.',
      email: 'Check the email address — it looks incomplete.',
      failed: 'The message could not be sent. Please try WhatsApp instead.',
      rate: 'Too many messages in a row. Please try again later.',
    },
  },
  es: {
    sent: '/es/mensaje-enviado/',
    subject: 'Nueva consulta desde el sitio web',
    labels: { name: 'Nombre', email: 'Correo', phone: 'Teléfono / WhatsApp', message: 'Mensaje' },
    errors: {
      method: 'Método no permitido.',
      missing: 'Falta tu nombre, una forma de contactarte o el mensaje.',
      email: 'Revisa el correo: parece incompleto.',
      failed: 'No se pudo enviar el mensaje. Escríbenos por WhatsApp.',
      rate: 'Demasiados mensajes seguidos. Inténtalo más tarde.',
    },
  },
};

/* Abuse limits. Serverless instances do not share memory, so this is a
   best-effort brake per warm instance, not a substitute for a firewall rule at
   the edge (see the security notes in the README). */
const RATE = { windowMs: 10 * 60 * 1000, perClient: 5, perInstance: 60 };
const hits = new Map();

function tooMany(req) {
  const now = Date.now();
  for (const [key, list] of hits) {
    const fresh = list.filter((time) => now - time < RATE.windowMs);
    if (fresh.length) hits.set(key, fresh);
    else hits.delete(key);
  }
  const forwarded = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  const client = forwarded || (req.socket && req.socket.remoteAddress) || 'unknown';
  const mine = hits.get(client) || [];
  const total = [...hits.values()].reduce((sum, list) => sum + list.length, 0);
  if (mine.length >= RATE.perClient || total >= RATE.perInstance) return true;
  mine.push(now);
  hits.set(client, mine);
  return false;
}

/* A browser always names where a form post came from. A post that claims to
   come from another site is not our form. Requests with no such headers (a
   script, curl) fall through to the rate limit and the honeypot. */
function crossSite(req) {
  const headers = req.headers || {};
  if (String(headers['sec-fetch-site'] || '') === 'cross-site') return true;
  const origin = String(headers.origin || '');
  if (!origin) return false;
  try {
    return new URL(origin).host !== String(headers.host || '');
  } catch (error) {
    return true;
  }
}

const clean = (value, max) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/* Keeps header injection out of the Reply-To we build from user input. */
const isEmail = (value) => /^[^\s@<>;,"]+@[^\s@<>;,"]+\.[^\s@<>;,"]+$/.test(value);

const wantsJson = (req) =>
  String(req.headers['x-requested-with'] || '') === 'fetch' ||
  String(req.headers.accept || '').includes('application/json');

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  const body = parseBody(req);
  /* hasOwnProperty, not a bare LANGS[body.lang] lookup: "lang":"toString" or
     "__proto__" would otherwise resolve through the prototype chain to a
     truthy value, then crash a few lines down when the code reads a field
     (like .errors.missing) that only the real per-language objects have. */
  const lang = Object.prototype.hasOwnProperty.call(LANGS, body.lang) ? body.lang : 'en';
  const copy = LANGS[lang];
  const json = wantsJson(req);
  res.setHeader('Cache-Control', 'no-store');

  const fail = (status, message) => {
    if (json) return res.status(status).json({ ok: false, error: message });
    res.status(303).setHeader('Location', `/${lang}/#contact`);
    return res.end();
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: copy.errors.method });
  }

  if (crossSite(req)) return res.status(403).json({ ok: false, error: copy.errors.failed });

  /* Bots fill hidden fields; people never see this one. */
  if (clean(body.company, 100)) {
    if (json) return res.status(200).json({ ok: true });
    res.status(303).setHeader('Location', copy.sent);
    return res.end();
  }

  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const phone = clean(body.phone, LIMITS.phone);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, LIMITS.message) : '';

  if (!name || !message || (!email && !phone)) return fail(400, copy.errors.missing);
  if (email && !isEmail(email)) return fail(400, copy.errors.email);
  if (tooMany(req)) return fail(429, copy.errors.rate);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!apiKey || !to) {
    console.error('contact: RESEND_API_KEY or CONTACT_TO is not configured');
    return fail(500, copy.errors.failed);
  }

  const lines = [
    `${copy.labels.name}: ${name}`,
    email ? `${copy.labels.email}: ${email}` : null,
    phone ? `${copy.labels.phone}: ${phone}` : null,
    '',
    `${copy.labels.message}:`,
    message,
    '',
    `— ${lang.toUpperCase()} · globalbeyondllc.com`,
  ].filter((line) => line !== null);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'Global Beyond LLC <onboarding@resend.dev>',
        to: [to],
        subject: `${copy.subject} — ${name}`,
        text: lines.join('\n'),
        ...(email && isEmail(email) ? { reply_to: email } : {}),
      }),
    });

    if (!response.ok) {
      console.error('contact: resend responded', response.status, await response.text());
      return fail(502, copy.errors.failed);
    }
  } catch (error) {
    console.error('contact: relay failed', error);
    return fail(502, copy.errors.failed);
  }

  if (json) return res.status(200).json({ ok: true });
  res.status(303).setHeader('Location', copy.sent);
  return res.end();
};
