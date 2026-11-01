import { writeFile } from 'node:fs/promises';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required to generate environment-specific security headers.');

const supabaseOrigin = new URL(supabaseUrl).origin;
const sentryDsn = process.env.VITE_SENTRY_DSN;
const sentryOrigin = sentryDsn ? new URL(sentryDsn).origin : '';
const connectSources = ["'self'", supabaseOrigin, sentryOrigin].filter(Boolean).join(' ');

const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src ${connectSources}; font-src 'self' data:; upgrade-insecure-requests

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

await writeFile('dist/_headers', headers, 'utf8');
console.log(`Wrote CSP with exact Supabase origin${sentryOrigin ? ' and Sentry ingest origin' : ''}.`);
