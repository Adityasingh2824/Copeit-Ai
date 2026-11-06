import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileCheck2, LoaderCircle, ShieldCheck, UploadCloud, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import './evidence-form.css';

function latestVersion(source) {
  return [...(source.document_versions || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
}

function latestReview(version) {
  return [...(version?.source_reviews || [])].sort((a, b) => String(b.reviewed_at || '').localeCompare(String(a.reviewed_at || '')))[0];
}

export default function EvidenceLibrary({ demo, tenant, user, sources, onBack, onRefresh, onManageTeam }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('official_guidance');
  const [publisherName, setPublisherName] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [sourcePublishedAt, setSourcePublishedAt] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [rationale, setRationale] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  function useCeExample() {
    setSourceType('official_guidance');
    setTitle('European Commission — CE marking');
    setPublisherName('European Commission');
    setCanonicalUrl('https://single-market-economy.ec.europa.eu/single-market/goods/ce-marking_en');
    setSourcePublishedAt('');
    setNotice('Example details added. Choose the CE marking excerpt file below, then upload it for review.');
  }

  async function call(action, body) {
    const { data, error } = await supabase.functions.invoke('index-document', { body });
    if (error) {
      let message = data?.error || error.message || 'The source action failed.';
      try {
        const detail = await error.context?.clone?.().json();
        if (detail?.error) message = detail.error;
      } catch { /* Keep the safe transport error when the response has no JSON body. */ }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function upload(event) {
    event.preventDefault();
    if (demo) return setNotice('Uploads are disabled in the browser-only preview. Sign in to use staging.');
    if (!file) return setNotice('Choose a TXT, Markdown, or CSV source first.');
    setBusy('upload'); setNotice('');
    try {
      const form = new FormData();
      form.set('action', 'upload'); form.set('tenantId', tenant.id); form.set('title', title.trim());
      form.set('sourceType', sourceType); form.set('versionLabel', 'v1'); form.set('jurisdiction', 'global'); form.set('language', 'en'); form.set('publisherName', publisherName.trim()); form.set('canonicalUrl', canonicalUrl.trim()); form.set('sourcePublishedAt', sourcePublishedAt); form.set('file', file);
      const result = await call('upload', form);
      setNotice(result.duplicate ? 'This exact source is already recorded.' : 'Source uploaded to quarantine and is awaiting independent review.');
      setFile(null); setFileInputKey(value => value + 1); setTitle(''); setPublisherName(''); setCanonicalUrl(''); setSourcePublishedAt(''); await onRefresh();
    } catch (error) { setNotice(error.message || 'Upload failed.'); } finally { setBusy(''); }
  }

  async function review(versionId, status) {
    if (rationale.trim().length < 3) return setNotice('Add a short decision rationale before submitting review.');
    setBusy(versionId); setNotice('');
    try {
      await call('review', { action: 'review', tenantId: tenant.id, documentVersionId: versionId, status, rationale: rationale.trim() });
      setReviewing(null); setRationale(''); setNotice(`Source ${status}.`); await onRefresh();
    } catch (error) { setNotice(error.message || 'Review failed.'); } finally { setBusy(''); }
  }

  async function queue(versionId) {
    setBusy(versionId); setNotice('');
    try { const result = await call('queue', { action: 'queue', tenantId: tenant.id, documentVersionId: versionId }); setNotice(result.duplicate ? `Processing is ${result.status}.` : 'Approved source queued for private processing.'); await onRefresh(); }
    catch (error) { setNotice(error.message || 'Could not queue processing.'); } finally { setBusy(''); }
  }

  async function download(versionId) {
    setBusy(versionId); setNotice('');
    try { const result = await call('download', { action: 'download', tenantId: tenant.id, documentVersionId: versionId }); window.open(result.url, '_blank', 'noopener,noreferrer'); }
    catch (error) { setNotice(error.message || 'Download failed.'); } finally { setBusy(''); }
  }

  return <div className="billing-workspace evidence-workspace">
    <header className="billing-workspace-header"><span className="app-eyebrow">WORKSPACE / EVIDENCE</span><div className="evidence-header-actions">{!demo && <button onClick={onManageTeam}><Users size={17}/> Invite reviewer</button>}<button onClick={onBack}><ArrowLeft size={17}/> Back to workspace</button></div></header>
    <main className="billing-workspace-main">
      <span className="app-eyebrow">PRIVATE SOURCE LIBRARY </span>
      <h1>Evidence with<br/><em>clear custody.</em></h1>
      <p className="billing-workspace-lede">Add an official public source with its publisher and original link. The file is held for independent review before it can be processed. TXT, Markdown and CSV only; PDFs are not supported yet.</p>
      {!demo && <section className="reviewer-guide" aria-label="Independent review required"><Users size={22}/><div><strong>Need an independent reviewer?</strong><p>Invite a second verified account before approving a source. The reviewer receives a one-time code to join this workspace.</p></div><button onClick={onManageTeam}>Invite reviewer</button></section>}
      {notice && <div className="form-message success" role="status">{notice}</div>}
      <section className="surface-card">
        <div className="surface-head"><div><span>ADD A SOURCE</span><h2>Add the source details.</h2></div><ShieldCheck size={24}/></div>
        <div className="evidence-form-intro"><p>Tell your reviewer where this source came from, then attach the text file.</p><button type="button" onClick={useCeExample}>Use CE marking example</button></div>
        <form onSubmit={upload} className="evidence-upload-form source-details-form">
          <label>Source title <small>Required</small><input required maxLength="300" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. European Commission — CE marking"/></label>
          <label>Source class <small>Required</small><select value={sourceType} onChange={event => setSourceType(event.target.value)}><option value="official_guidance">Official public guidance</option><option value="synthetic">Synthetic test source</option></select></label>
          {sourceType === 'official_guidance' && <><label>Official publisher <small>Required</small><input required maxLength="240" value={publisherName} onChange={event => setPublisherName(event.target.value)} placeholder="e.g. European Commission"/></label><label>Original source URL <small>Required · HTTPS</small><input required type="url" pattern="https://.*" title="Enter an HTTPS link to the official source" value={canonicalUrl} onChange={event => setCanonicalUrl(event.target.value)} placeholder="https://…"/></label><label>Published or effective date <small>Optional</small><input type="date" value={sourcePublishedAt} onChange={event => setSourcePublishedAt(event.target.value)}/></label></>}
          <label>Source file <small>Required · TXT, Markdown or CSV</small><input key={fileInputKey} required type="file" accept="text/plain,text/markdown,text/csv,.txt,.md,.csv" onChange={event => setFile(event.target.files?.[0] || null)}/></label>
          <div className="source-upload-action"><p>Next: an independent reviewer checks the source and its reuse terms.</p><button className="button-primary" disabled={busy === 'upload'}><UploadCloud size={17}/>{busy === 'upload' ? 'Uploading…' : 'Upload for review'}</button></div>
        </form>
      </section>
      <section className="list-surface evidence-list" aria-live="polite">
        <div className="surface-head"><div><span>SOURCE REGISTER</span><h2>{sources.length ? `${sources.length} source${sources.length === 1 ? '' : 's'}` : 'No sources yet'}</h2></div>{demo ? <FileCheck2 size={24}/> : <button type="button" onClick={() => onRefresh()}>Refresh status</button>}</div>
        {!sources.length && <p className="billing-workspace-lede">No source has been uploaded to this workspace.</p>}
        {sources.map(source => {
          const version = latestVersion(source); const currentReview = latestReview(version); const reviewStatus = currentReview?.status || 'pending'; const isUploader = source.created_by === user?.id;
          return <article className="product-list-row" key={source.id}><div className="product-symbol"><FileCheck2 size={21}/></div><div><h3>{source.title}</h3><p>{source.source_type.replace('_', ' ')} · {version?.version_label || 'Version pending'}</p>{source.publisher_name && <small>{source.publisher_name}{source.source_published_at ? ` · ${source.source_published_at}` : ''}</small>}{source.canonical_url && <small><a href={source.canonical_url} target="_blank" rel="noreferrer">View canonical source</a></small>}<small>Review: {reviewStatus} · Processing: {version?.extraction_status || 'pending'}{source.retrieval_eligible ? ' · Retrieval eligible' : ''}</small>{currentReview?.rationale && <small>Decision note: {currentReview.rationale}</small>}</div><div className="evidence-actions">
            {reviewStatus === 'pending' && <button onClick={() => isUploader ? setNotice('Independent review is required. Sign in with the invited reviewer account to approve or reject this source.') : setReviewing(reviewing === version?.id ? null : version?.id)}>Review</button>}
            {reviewStatus === 'approved' && source.source_type === 'official_guidance' && version?.extraction_status !== 'ready' && <button onClick={() => queue(version.id)} disabled={busy === version.id}>{busy === version.id ? <LoaderCircle size={15}/> : 'Queue processing'}</button>}
            {reviewStatus === 'approved' && source.source_type === 'synthetic' && <small>Review fixture</small>}
            {reviewStatus === 'approved' && version?.extraction_status === 'ready' && <button onClick={() => download(version.id)} disabled={busy === version.id}><Download size={15}/>Download</button>}
            <span className={`status-pill ${reviewStatus === 'approved' ? 'green' : ''}`}>{reviewStatus}</span>
          </div>{reviewing === version?.id && <div className="evidence-review"><label>Review rationale<textarea minLength="3" maxLength="4000" value={rationale} onChange={event => setRationale(event.target.value)} placeholder="Why is this source approved or rejected?"/></label><div><button onClick={() => review(version.id, 'approved')} disabled={busy === version.id}><CheckCircle2 size={15}/>Approve source</button><button onClick={() => review(version.id, 'rejected')} disabled={busy === version.id}>Reject source</button></div><small>Write a decision rationale of at least three characters, then choose one decision. The uploader cannot approve or reject their own source.</small></div>}</article>;
        })}
      </section>
    </main>
  </div>;
}
