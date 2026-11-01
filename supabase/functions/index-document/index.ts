import { createClient } from 'npm:@supabase/supabase-js@2.81.1';

const MAX_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv']);
const ALLOWED_SOURCE_TYPES = new Set(['synthetic', 'official_guidance']);
const deployedOrigins = ['https://copeit-ai.vercel.app', 'https://copeit-ai-staging.copeit-ai.workers.dev'];
const allowedOrigins = [...new Set([
  ...(Deno.env.get('COPEIT_ALLOWED_ORIGINS') || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4174').split(',').map(value => value.trim()),
  ...deployedOrigins,
])];

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS', vary: 'Origin',
  } });
}

function keyset(name: string, legacy: string) {
  try { const parsed = JSON.parse(Deno.env.get(name) || '{}'); if (typeof parsed.default === 'string') return parsed.default; } catch { /* legacy fallback */ }
  return Deno.env.get(legacy);
}

async function sha256(value: string | ArrayBuffer) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function requestData(request: Request) {
  return (request.headers.get('content-type') || '').includes('multipart/form-data') ? await request.formData() : await request.json();
}

Deno.serve(async request => {
  const requestOrigin = request.headers.get('origin');
  // Browsers always send Origin for this cross-origin call. Permit origin-less
  // authenticated staging CLI/test requests, while rejecting every supplied
  // origin that is not on the allow-list.
  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) return new Response('Origin not allowed', { status: 403 });
  const origin = requestOrigin || allowedOrigins[0];
  if (request.method === 'OPTIONS') return json({}, 200, origin);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405, origin);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const url = Deno.env.get('SUPABASE_URL');
  // New Supabase Edge Function runtimes expose a publishable key. Retain the
  // legacy anon-key fallback only for transition, never in browser code.
  const publishable = keyset('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const secret = keyset('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!token) return json({ error: 'Sign in required' }, 401, origin);
  if (!url || !publishable || !secret) return json({ error: 'Server is not configured' }, 503, origin);
  const userDb = createClient(url, publishable, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: auth } = await userDb.auth.getUser(token);
  if (!auth.user) return json({ error: 'Sign in required' }, 401, origin);
  let input: FormData | Record<string, unknown>;
  try { input = await requestData(request); } catch { return json({ error: 'Invalid request payload' }, 400, origin); }
  const get = (key: string) => input instanceof FormData ? input.get(key) : input[key];
  const action = String(get('action') || 'upload');
  const tenantId = String(get('tenantId') || '');
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return json({ error: 'Invalid tenantId' }, 400, origin);
  // The function already verified this user JWT. Query membership through the
  // server client with an explicit user-and-tenant predicate so this preflight
  // does not depend on a second PostgREST JWT context.
  const { data: membership } = await admin.from('memberships').select('role').eq('tenant_id', tenantId).eq('user_id', auth.user.id).maybeSingle();
  if (!membership) return json({ error: 'Workspace access denied' }, 403, origin);

  if (action === 'review') {
    const versionId = String(get('documentVersionId') || '');
    if (!/^[0-9a-f-]{36}$/i.test(versionId)) return json({ error: 'Invalid document version' }, 400, origin);
    const { data, error } = await userDb.rpc('submit_source_review', { p_document_version_id: versionId, p_status: String(get('status') || ''), p_rationale: String(get('rationale') || '') });
    if (error) return json({ error: error.message || 'Review was not accepted' }, error.code === '42501' ? 403 : 400, origin);
    return json({ review: data }, 200, origin);
  }

  if (action === 'download') {
    const versionId = String(get('documentVersionId') || '');
    if (!/^[0-9a-f-]{36}$/i.test(versionId)) return json({ error: 'Invalid document version' }, 400, origin);
    const { data: version } = await admin.from('document_versions').select('storage_bucket,storage_path,source_reviews!inner(status)').eq('id', versionId).eq('tenant_id', tenantId).eq('source_reviews.status', 'approved').maybeSingle();
    if (!version) return json({ error: 'Approved source not found' }, 404, origin);
    const { data, error } = await admin.storage.from(version.storage_bucket).createSignedUrl(version.storage_path, 60);
    if (error || !data?.signedUrl) return json({ error: 'Could not prepare download' }, 502, origin);
    return json({ url: data.signedUrl, expiresIn: 60 }, 200, origin);
  }

  if (action === 'queue') {
    if (!['owner','admin','lead','editor'].includes(membership.role)) return json({ error: 'Editor access required' }, 403, origin);
    const versionId = String(get('documentVersionId') || '');
    if (!/^[0-9a-f-]{36}$/i.test(versionId)) return json({ error: 'Invalid document version' }, 400, origin);
    const { data: version } = await admin.from('document_versions').select('id,source_reviews!inner(status)').eq('id', versionId).eq('tenant_id', tenantId).eq('source_reviews.status', 'approved').maybeSingle();
    if (!version) return json({ error: 'Approved source not found' }, 404, origin);
    const { data: existing } = await admin.from('ingestion_jobs').select('id,status,attempts').eq('tenant_id', tenantId).eq('document_version_id', versionId).maybeSingle();
    if (existing?.status === 'completed') return json({ job: existing, duplicate: true, status: 'completed' }, 200, origin);
    if (existing?.status === 'queued' || existing?.status === 'retry_wait' || existing?.status === 'extracting' || existing?.status === 'chunking' || existing?.status === 'embedding') return json({ job: existing, duplicate: true, status: existing.status }, 202, origin);
    const { data: job, error: jobError } = existing
      ? await admin.from('ingestion_jobs').update({ status: 'queued', available_at: new Date().toISOString(), locked_at: null, locked_by: null, completed_at: null, error_code: null, error_detail: null }).eq('id', existing.id).select('id,status').single()
      : await admin.from('ingestion_jobs').insert({ tenant_id: tenantId, document_version_id: versionId, idempotency_key: `process:${versionId}`, status: 'queued', created_by: auth.user.id }).select('id,status').single();
    if (jobError || !job) return json({ error: 'Could not queue ingestion job' }, 500, origin);
    await admin.from('document_versions').update({ extraction_status: 'pending' }).eq('id', versionId).eq('tenant_id', tenantId);
    return json({ jobId: job.id, documentVersionId: versionId, status: 'queued' }, 202, origin);
  }

  if (action !== 'upload' || !['owner','admin','lead','editor'].includes(membership.role)) return json({ error: 'Editor access required' }, 403, origin);
  const file = get('file'); const title = String(get('title') || '').trim(); const sourceType = String(get('sourceType') || ''); const versionLabel = String(get('versionLabel') || 'v1').trim();
  const canonicalUrl = String(get('canonicalUrl') || '').trim(); const publisherName = String(get('publisherName') || '').trim();
  if (!(file instanceof File) || title.length < 2 || versionLabel.length < 1 || !ALLOWED_SOURCE_TYPES.has(sourceType)) return json({ error: 'The MVP accepts a titled synthetic or official public source only' }, 400, origin);
  if (sourceType === 'official_guidance' && (!/^https:\/\//i.test(canonicalUrl) || publisherName.length < 2)) return json({ error: 'Official public sources require an HTTPS canonical URL and publisher name' }, 400, origin);
  if (file.size < 1 || file.size > MAX_BYTES || !ALLOWED_TYPES.has(file.type)) return json({ error: 'Use a UTF-8 TXT, Markdown, or CSV file under 1 MB' }, 415, origin);
  const bytes = await file.arrayBuffer(); let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return json({ error: 'Source must be UTF-8 text' }, 422, origin); }
  if (!text.trim() || text.includes('\u0000')) return json({ error: 'Source text is invalid' }, 422, origin);
  const digest = await sha256(bytes);
  const { data: duplicate } = await admin.from('document_versions').select('id').eq('tenant_id', tenantId).eq('sha256', digest).maybeSingle();
  if (duplicate) return json({ documentVersionId: duplicate.id, duplicate: true }, 200, origin);
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 160) || 'source.txt'; const path = `${tenantId}/${crypto.randomUUID()}/${safeName}`;
  const { error: storageError } = await admin.storage.from('rag-quarantine').upload(path, bytes, { contentType: file.type, upsert: false });
  if (storageError) return json({ error: 'Quarantine upload failed' }, 502, origin);
  const { data: source, error: sourceError } = await admin.from('sources').insert({ tenant_id: tenantId, title, source_type: sourceType, jurisdiction: String(get('jurisdiction') || 'global').slice(0, 80), language: String(get('language') || 'en'), canonical_url: canonicalUrl || null, licence_note: String(get('licenceNote') || '') || null, publisher_name: publisherName || null, source_published_at: String(get('sourcePublishedAt') || '') || null, source_checked_at: new Date().toISOString(), created_by: auth.user.id }).select('id').single();
  if (sourceError || !source) return json({ error: 'Source record failed' }, 500, origin);
  const { data: version, error: versionError } = await admin.from('document_versions').insert({ tenant_id: tenantId, source_id: source.id, version_label: versionLabel, storage_bucket: 'rag-quarantine', storage_path: path, media_type: file.type, byte_size: file.size, sha256: digest, extraction_status: 'pending', source_fetched_at: new Date().toISOString(), created_by: auth.user.id }).select('id').single();
  if (versionError || !version) return json({ error: 'Source version failed' }, 500, origin);
  const { error: reviewError } = await admin.from('source_reviews').insert({ tenant_id: tenantId, document_version_id: version.id, status: 'pending' });
  if (reviewError) return json({ error: 'Review record failed' }, 500, origin);
  return json({ sourceId: source.id, documentVersionId: version.id, approvalStatus: 'pending' }, 201, origin);
});
