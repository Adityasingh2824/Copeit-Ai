import { createClient } from 'npm:@supabase/supabase-js@2.81.1';
import { chunkApprovedText } from './worker-chunking.js';

const DIMENSIONS = 768;
const MAX_BATCH = 3;
const MAX_TEXT_BYTES = 1024 * 1024;

function keyset(name: string, legacy: string) {
  try {
    const parsed = JSON.parse(Deno.env.get(name) || '{}');
    if (typeof parsed.default === 'string') return parsed.default;
  } catch { /* use the legacy key during controlled transition only */ }
  return Deno.env.get(legacy);
}

function result(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createEmbedding(text: string, apiKey: string, model: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ content: { parts: [{ text: `title: Copeit approved source\ntext: ${text}` }] }, output_dimensionality: DIMENSIONS }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`gemini_embedding_${response.status}`);
  const values = (await response.json())?.embedding?.values;
  if (!Array.isArray(values) || values.length !== DIMENSIONS || !values.every(value => typeof value === 'number' && Number.isFinite(value))) throw new Error('invalid_embedding');
  return values;
}

async function failJob(admin: ReturnType<typeof createClient>, job: any, error: unknown) {
  const code = error instanceof Error ? error.message.replace(/[^a-z0-9_]/gi, '_').slice(0, 120) : 'worker_failure';
  const attempt = Number(job.attempts || 1);
  const terminal = attempt >= Number(job.max_attempts || 3);
  const delayMinutes = Math.min(30, 2 ** Math.max(0, attempt - 1));
  const history = [...(Array.isArray(job.failure_history) ? job.failure_history : []), { code, at: new Date().toISOString() }].slice(-12);
  await admin.from('document_versions').update({ extraction_status: 'failed' }).eq('id', job.document_version_id).eq('tenant_id', job.tenant_id);
  await admin.from('ingestion_jobs').update({
    status: terminal ? 'dead_letter' : 'retry_wait',
    available_at: terminal ? null : new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    locked_at: null, locked_by: null, last_heartbeat_at: new Date().toISOString(),
    completed_at: terminal ? new Date().toISOString() : null,
    error_code: code, error_detail: null, failure_history: history,
  }).eq('id', job.id);
  await admin.from('ingestion_job_events').insert({ tenant_id: job.tenant_id, ingestion_job_id: job.id, event_type: terminal ? 'dead_letter' : 'retry_scheduled', error_code: code, attempt });
}

async function processJob(admin: ReturnType<typeof createClient>, job: any, apiKey: string, model: string) {
  const { data: version, error: versionError } = await admin.from('document_versions')
    .select('id,storage_bucket,storage_path,media_type,source_reviews!inner(status)')
    .eq('id', job.document_version_id).eq('tenant_id', job.tenant_id).eq('source_reviews.status', 'approved').maybeSingle();
  if (versionError || !version) throw new Error('approved_source_not_found');
  const { data: file, error: fileError } = await admin.storage.from(version.storage_bucket).download(version.storage_path);
  if (fileError || !file || file.size > MAX_TEXT_BYTES) throw new Error('approved_source_unavailable');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()).trim(); } catch { throw new Error('source_not_utf8'); }
  const parts = chunkApprovedText(text);
  if (!parts.length) throw new Error('no_extractable_text');

  await admin.from('ingestion_jobs').update({ status: 'embedding', chunks_total: parts.length, chunks_embedded: 0, last_heartbeat_at: new Date().toISOString() }).eq('id', job.id);
  await admin.from('document_versions').update({ extraction_status: 'processing' }).eq('id', version.id).eq('tenant_id', job.tenant_id);
  await admin.from('document_chunks').delete().eq('tenant_id', job.tenant_id).eq('document_version_id', version.id);
  for (let ordinal = 0; ordinal < parts.length; ordinal += 1) {
    const part = parts[ordinal];
    const { data: chunk, error: chunkError } = await admin.from('document_chunks').insert({
      tenant_id: job.tenant_id, document_version_id: version.id, ordinal, content: part.content,
      heading_path: part.headingPath, token_count: Math.max(1, Math.ceil(part.content.length / 4)), content_sha256: await sha256(part.content),
    }).select('id').single();
    if (chunkError || !chunk) throw new Error('chunk_insert_failed');
    const { error: vectorError } = await admin.rpc('store_chunk_embedding', {
      p_tenant_id: job.tenant_id, p_chunk_id: chunk.id, p_model: model, p_embedding: await createEmbedding(part.content, apiKey, model),
    });
    if (vectorError) throw new Error('embedding_store_failed');
    await admin.from('ingestion_jobs').update({ chunks_embedded: ordinal + 1, last_heartbeat_at: new Date().toISOString() }).eq('id', job.id);
  }
  if (version.storage_bucket === 'rag-quarantine') {
    const { error } = await admin.storage.from('rag-approved').upload(version.storage_path, file, { contentType: version.media_type, upsert: false });
    if (error) throw new Error('approved_storage_copy_failed');
    await admin.from('document_versions').update({ storage_bucket: 'rag-approved' }).eq('id', version.id).eq('tenant_id', job.tenant_id);
  }
  await admin.from('document_versions').update({ extraction_status: 'ready' }).eq('id', version.id).eq('tenant_id', job.tenant_id);
  await admin.from('ingestion_jobs').update({ status: 'completed', locked_at: null, locked_by: null, completed_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString(), error_code: null, error_detail: null }).eq('id', job.id);
  await admin.from('ingestion_job_events').insert({ tenant_id: job.tenant_id, ingestion_job_id: job.id, event_type: 'completed', attempt: job.attempts });
}

Deno.serve(async request => {
  if (request.method !== 'POST') return result({ error: 'POST required' }, 405);
  const expectedToken = Deno.env.get('INGESTION_WORKER_TOKEN');
  const suppliedToken = request.headers.get('x-copeit-worker-token') || '';
  if (!expectedToken || !equal(suppliedToken, expectedToken)) return result({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const secret = keyset('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!url || !secret || !apiKey) return result({ error: 'Worker is not configured' }, 503);
  const input = await request.json().catch(() => ({})) as { tenantId?: string; documentVersionId?: string };
  if (!input.tenantId || !input.documentVersionId || !/^[0-9a-f-]{36}$/i.test(input.tenantId) || !/^[0-9a-f-]{36}$/i.test(input.documentVersionId)) return result({ error: 'A specific workspace and document version are required' }, 400);
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const workerId = crypto.randomUUID();
  const outcomes: { jobId: string; status: string }[] = [];
  for (let count = 0; count < 1; count += 1) {
    const { data: job, error } = await admin.rpc('claim_official_ingestion_job', { p_worker_id: workerId, p_tenant_id: input.tenantId, p_document_version_id: input.documentVersionId });
    if (error) return result({ error: 'Unable to claim an ingestion job' }, 503);
    if (!job) break;
    try { await processJob(admin, job, apiKey, Deno.env.get('GEMINI_EMBEDDING_MODEL') || 'gemini-embedding-2'); outcomes.push({ jobId: job.id, status: 'completed' }); }
    catch (error) { await failJob(admin, job, error); outcomes.push({ jobId: job.id, status: Number(job.attempts) >= Number(job.max_attempts) ? 'dead_letter' : 'retry_wait' }); }
  }
  return result({ workerId, outcomes });
});
