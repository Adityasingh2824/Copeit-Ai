const GIS_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const DISCOVERY_SCOPES = `${DRIVE_READ_SCOPE} ${GMAIL_READ_SCOPE}`;
const FILE_TERMS = ['certificate', 'ce', 'compliance', 'declaration', 'datasheet', 'doc', 'emc', 'invoice', 'manual', 'msds', 'packaging', 'report', 'rohs', 'specification', 'supplier', 'test', 'test report', 'warranty'];

function loadScript(url, ready) {
  if (ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    const script = existing || document.createElement('script');
    let complete = false;
    const finish = () => { if (!complete && ready()) { complete = true; resolve(); } };
    const fail = () => { if (!complete) { complete = true; reject(new Error('Google libraries could not be loaded.')); } };
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (!existing) { script.src = url; script.async = true; document.head.appendChild(script); }
    const deadline = Date.now() + 10_000;
    const poll = () => { if (complete) return; if (ready()) return finish(); if (Date.now() >= deadline) return fail(); window.setTimeout(poll, 50); };
    poll();
  });
}

async function ensureGoogleIdentity() { await loadScript(GIS_URL, () => Boolean(window.google?.accounts?.oauth2)); }

function requestToken(config, scope) {
  if (!discoveryConfigured(config)) throw new Error('Google connection setup is incomplete. Contact the Copeit administrator.');
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId, scope, include_granted_scopes: false,
      error_callback: () => reject(new Error('Google authorization was closed or could not open.')),
      callback: result => result.error || !result.access_token ? reject(new Error('Google authorization was not granted.')) : resolve(result.access_token),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

function safeText(value, limit = 240) { return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, limit); }

function scoreCandidate(...values) {
  const text = values.join(' ').toLowerCase();
  const matches = FILE_TERMS.filter(term => text.includes(term));
  return { score: Math.min(100, matches.length * 17 + (matches.includes('test report') ? 18 : 0)), matches };
}

async function googleJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Google access expired. Connect again to continue discovery.');
    throw new Error(`Google returned ${response.status}. Check the enabled APIs and your test-user access.`);
  }
  return response.json();
}

async function discoverDrive(token) {
  const fields = 'files(id,name,mimeType,modifiedTime,description,webViewLink)';
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', 'trashed = false'); url.searchParams.set('orderBy', 'modifiedTime desc'); url.searchParams.set('pageSize', '100'); url.searchParams.set('fields', fields);
  const payload = await googleJson(url, token);
  return (payload.files || []).map(file => {
    const match = scoreCandidate(file.name, file.description, file.mimeType);
    return { id: safeText(file.id, 160), source: 'drive', title: safeText(file.name, 240), mimeType: safeText(file.mimeType, 120), modifiedTime: safeText(file.modifiedTime, 40), url: /^https:\/\/(drive|docs)\.google\.com\//.test(file.webViewLink || '') ? file.webViewLink : '', score: match.score, matches: match.matches };
  }).filter(file => file.score > 0).sort((a, b) => b.score - a.score || b.modifiedTime.localeCompare(a.modifiedTime)).slice(0, 75);
}

function attachmentParts(part, output = []) {
  if (part?.filename && part?.body?.attachmentId) output.push({ name: safeText(part.filename, 240), mimeType: safeText(part.mimeType, 120) });
  for (const child of part?.parts || []) attachmentParts(child, output);
  return output;
}

async function discoverGmail(token) {
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('q', 'has:attachment'); listUrl.searchParams.set('maxResults', '50');
  const listing = await googleJson(listUrl, token);
  const messages = await Promise.all((listing.messages || []).slice(0, 50).map(async ({ id }) => {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
    url.searchParams.set('format', 'metadata'); ['Subject', 'From', 'Date'].forEach(header => url.searchParams.append('metadataHeaders', header));
    const message = await googleJson(url, token);
    const headers = Object.fromEntries((message.payload?.headers || []).map(header => [header.name.toLowerCase(), safeText(header.value, 300)]));
    return attachmentParts(message.payload).map(attachment => {
      const match = scoreCandidate(headers.subject, headers.from, attachment.name, attachment.mimeType);
      return { id: `${safeText(id, 160)}:${attachment.name}`, source: 'gmail', title: attachment.name, mimeType: attachment.mimeType, emailSubject: headers.subject || 'No subject', emailFrom: headers.from || 'Sender unavailable', messageDate: headers.date || '', score: match.score, matches: match.matches };
    });
  }));
  return messages.flat().filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 75);
}

export function pickerConfigured(config) { return Boolean(config.clientId && config.apiKey && /^\d+$/.test(config.projectNumber || '')); }
export function discoveryConfigured(config) { return Boolean(config.clientId && /^\d+$/.test(config.projectNumber || '')); }

// Access tokens remain in browser memory. No Drive, Gmail or token data is sent to Copeit.
export async function discoverGoogleEvidence(config) {
  if (!discoveryConfigured(config)) throw new Error('Google connection setup is incomplete. Contact the Copeit administrator.');
  await ensureGoogleIdentity();
  const token = await requestToken(config, DISCOVERY_SCOPES);
  const [drive, gmail] = await Promise.allSettled([discoverDrive(token), discoverGmail(token)]);
  const warnings = [];
  if (drive.status === 'rejected') warnings.push(`Drive: ${drive.reason.message}`);
  if (gmail.status === 'rejected') warnings.push(`Gmail: ${gmail.reason.message}`);
  if (drive.status === 'rejected' && gmail.status === 'rejected') throw new Error(warnings.join(' '));
  return { token, drive: drive.status === 'fulfilled' ? drive.value : [], gmail: gmail.status === 'fulfilled' ? gmail.value : [], warnings };
}

export function revokeGoogleAccess(token) { if (token && window.google?.accounts?.oauth2?.revoke) window.google.accounts.oauth2.revoke(token, () => {}); }
export { DISCOVERY_SCOPES, DRIVE_READ_SCOPE, GMAIL_READ_SCOPE, scoreCandidate };
