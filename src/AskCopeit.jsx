import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bot, CheckCircle2, CornerDownLeft, FileText, Layers3, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import './ask-citations.css';
import { isWorkspaceLookup } from '../supabase/functions/ask-copeit/question-routing.js';
import { answerWorkspaceQuestion } from './ask-workspace.js';

const prompts = [
  { label: 'What products are in this workspace?', icon: Layers3 },
  { label: 'What needs attention next?', icon: CheckCircle2 },
  { label: 'What evidence should we collect?', icon: FileText },
];
const pilotPrompts = [
  { label: 'Do all products need CE marking?', icon: FileText },
  { label: 'What does the CE marking source say?', icon: ShieldCheck },
  { label: 'What evidence is missing for my product?', icon: Layers3 },
];

const demoKey = 'copeit-preview-chat';
const maxSavedMessages = 60;
// The authenticated server capability check controls availability and kill switches.
const geminiBuild = Boolean(supabase);

function storageFor(demo) {
  return demo ? window.localStorage : window.sessionStorage;
}

function conversationKey(demo, tenantId, userId) {
  return demo ? demoKey : `cope-chat:${tenantId}:${userId}`;
}

function SourceReference({ refItem, onSection }) {
  const label = <><FileText size={13}/>{refItem.label}{refItem.section ? ` · ${refItem.section}` : ''}{refItem.page ? ` · page ${refItem.page}` : ''}<ArrowUpRight size={13}/></>;
  if (['source', 'web'].includes(refItem.type) && typeof refItem.url === 'string') {
    try {
      const url = new URL(refItem.url);
      if (url.protocol === 'https:') return <a href={url.href} target="_blank" rel="noopener noreferrer">{label}</a>;
    } catch { /* Missing or invalid URLs do not become clickable links. */ }
  }
  if (refItem.type === 'source') return <span>{label}</span>;
  return <button type="button" onClick={() => onSection(refItem.type === 'product' ? 'Products' : 'Tasks')}>{label}</button>;
}

function readConversation(demo, tenantId, userId) {
  try {
    const value = storageFor(demo).getItem(conversationKey(demo, tenantId, userId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.slice(-maxSavedMessages) : [];
  } catch { return []; }
}

export default function AskCopeit({ demo, tenant, user, products, tasks, onSection, onAddProduct, onAddTask }) {
  const [messages, setMessages] = useState(() => readConversation(demo, tenant?.id, user?.id));
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [productId, setProductId] = useState('');
  const [error, setError] = useState('');
  const [capability, setCapability] = useState(null);
  const [capabilityError, setCapabilityError] = useState('');
  const [capabilityAttempt, setCapabilityAttempt] = useState(0);
  const endRef = useRef(null);
  const geminiEnabled = capability?.tenantId === tenant?.id && capability?.userId === user?.id && capability?.enabled === true;

  useEffect(() => {
    if (demo || !geminiBuild || !tenant?.id || !user?.id) return;
    let active = true;
    setCapabilityError('');
    supabase.functions.invoke('ask-copeit', { body: { action: 'capabilities', tenantId: tenant.id } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || typeof data?.regulatoryAnswers !== 'boolean') {
          setCapability(null);
          setCapabilityError('Could not check AI availability. Please retry.');
          return;
        }
        setCapability({ tenantId: tenant.id, userId: user.id, enabled: data.regulatoryAnswers });
      })
      .catch(() => {
        if (active) {
          setCapability(null);
          setCapabilityError('Could not check AI availability. Please retry.');
        }
      });
    return () => { active = false; };
  }, [demo, tenant?.id, user?.id, capabilityAttempt]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => { setMessages(readConversation(demo, tenant?.id, user?.id)); }, [demo, tenant?.id, user?.id]);
  useEffect(() => {
    try { storageFor(demo).setItem(conversationKey(demo, tenant?.id, user?.id), JSON.stringify(messages.slice(-maxSavedMessages))); } catch { /* Conversation remains available for this view only. */ }
  }, [messages, demo, tenant?.id, user?.id]);

  function clearConversation() {
    try { storageFor(demo).removeItem(conversationKey(demo, tenant?.id, user?.id)); } catch { /* State reset still works. */ }
    setMessages([]); setError('');
  }

  async function send(text = draft) {
    const question = text.trim();
    if (!question || sending) return;
    setDraft(''); setError(''); setSending(true);
    try {
      let reply = answerWorkspaceQuestion(question, products, tasks);
      if (!demo && geminiEnabled && !isWorkspaceLookup(question)) {
        const { data, error: issue } = await supabase.functions.invoke('ask-copeit', { body: { tenantId: tenant.id, question, productId: productId || null } });
        if (issue?.context?.status === 403) {
          setCapability(null);
          throw new Error('Regulatory answers are unavailable for this workspace. Product and task lookups are still available.');
        }
        if (issue) {
          let message = issue.message;
          try { message = (await issue.context?.clone().json())?.error || message; } catch { /* Preserve the transport error if no JSON response is available. */ }
          throw new Error(message || 'The AI guide is unavailable.');
        }
        if (!data?.answer) throw new Error(data?.error || 'The AI guide is unavailable.');
        reply = { status: data.status, answerOrigin: data.answerOrigin, searchAttribution: data.searchAttribution, body: [data.answer, data.missingFacts?.length && `Information needed: ${data.missingFacts.join('; ')}`, data.uncertainty && `Uncertainty: ${data.uncertainty}`, data.assumptions?.length && `Assumptions: ${data.assumptions.join('; ')}`, data.nextActions?.length && `Next steps: ${data.nextActions.join('; ')}`].filter(Boolean).join('\n\n'), refs: data.refs || [] };
      }
      const created = new Date().toISOString();
      const next = [...messages, { id: crypto.randomUUID(), role: 'user', body: question, created_at: created }, { id: crypto.randomUUID(), role: 'assistant', body: reply.body, status: reply.status, answerOrigin: reply.answerOrigin || 'workspace', searchAttribution: reply.searchAttribution, source_refs: reply.refs, created_at: created }];
      setMessages(next);
      if (demo) { try { localStorage.setItem(demoKey, JSON.stringify(next.slice(-maxSavedMessages))); } catch { setError('This browser could not save the preview conversation.'); } }
    } catch (issue) {
      setDraft(question);
      setError(issue.message || 'Could not answer this question. Please try again.');
    } finally { setSending(false); }
  }

  return <div className="ask-page">
    <div className="ask-header"><div><span className="app-eyebrow">MEET COPE </span><h1>Ask Cope<span>.</span></h1><p>Find what your team has recorded. See the next action. Keep every answer in context.</p></div><div className="ask-status"><span className="status-light"/> {!demo && geminiEnabled ? 'REVIEWED SOURCES + WEB' : 'WORKSPACE RECORDS ONLY'}</div></div>
    <div className="ask-layout"><section className="ask-chat" aria-label="Ask Cope conversation">
      {!demo && geminiEnabled && <label className="ask-product-selector">Product context <select value={productId} onChange={event => setProductId(event.target.value)}><option value="">No product selected</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.model || 'model not recorded'}</option>)}</select></label>}
      <div className="ask-chat-top"><div><strong>Cope</strong><small>Product context &amp; action lookup</small></div><span className="ask-chat-live">{demo ? 'PREVIEW' : 'PRIVATE CHAT'}</span>{messages.length > 0 && <button className="ask-clear" type="button" onClick={clearConversation}><Trash2 size={14}/>Clear</button>}</div>
      <div className="ask-messages" aria-live="polite">{messages.length === 0 ? <div className="ask-empty"><div className="ask-empty-orb"><img src="/copeit-mark.png" alt=""/></div><span className="ask-mini-label">A GOOD PLACE TO START</span><h2>Clarity begins<br/>with a question.</h2><p>{!demo && geminiEnabled ? 'Ask about your product, reviewed sources, or a general topic. Cope searches the web when more information is needed.' : 'Ask about your recorded products or open tasks. I’ll show the source records behind each answer.'}</p><div className="ask-suggestions">{(!demo && geminiEnabled ? pilotPrompts : prompts).map(({ label, icon: Icon }) => <button key={label} onClick={() => send(label)}><Icon size={16}/>{label}<ArrowUpRight size={15}/></button>)}</div></div> : messages.map(message => <div key={message.id} className={`ask-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`}>{message.role === 'user' && <div className="ask-message-avatar">{user.email?.[0]?.toUpperCase()}</div>}<div className="ask-message-content"><span>{message.role === 'user' ? 'You' : 'Cope'}</span>{message.role === 'assistant' && message.status && <strong className="ask-answer-status">{message.status === 'answered' ? (message.answerOrigin === 'web_search' ? 'WEB RESEARCH ANSWER' : 'REVIEWED-SOURCE ANSWER') : message.status === 'needs_product_facts' ? 'PRODUCT FACTS NEEDED' : 'INSUFFICIENT EVIDENCE'}</strong>}<p>{message.body}</p>{message.searchAttribution && <iframe title="Google Search attribution" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={message.searchAttribution} className="ask-search-attribution"/>}{message.role === 'assistant' && !!message.source_refs?.length && <div className="ask-sources"><small>{message.answerOrigin === 'web_search' ? 'WEB SOURCES · REQUIRE REVIEW' : message.source_refs.some(ref => ref.type === 'source') ? 'APPROVED SOURCE CITATIONS' : 'WORKSPACE RECORDS'}</small>{message.source_refs.map(ref => <SourceReference key={ref.id} refItem={ref} onSection={onSection}/>)}</div>}</div></div>)}{sending && <div className="ask-thinking" role="status"><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/><span className="ask-thinking-dot"/>Cope is loading…</div>}<div ref={endRef}/></div>
      {capabilityError && <div className="ask-error" role="alert">{capabilityError} <button type="button" onClick={() => setCapabilityAttempt(value => value + 1)}>Retry AI connection</button></div>}
      {error && <div className="ask-error" role="alert">{error}</div>}
      <div className="ask-composer"><form onSubmit={event => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="ask-input">Ask Cope</label><textarea id="ask-input" rows="2" maxLength="1200" placeholder="Ask about a product, open action, or evidence context…" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }}/><button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><ArrowRight size={20}/></button></form><div className="ask-composer-note"><span><ShieldCheck size={13}/> No regulatory conclusions without approved sources</span><span>ENTER TO SEND <CornerDownLeft size={12}/></span></div></div>
    </section><aside className="ask-rail"><div className="ask-rail-card accent"><span>YOUR CONTEXT</span><h2>One clear view.</h2><p>{!demo && geminiEnabled ? 'Reviewed-source and web-research answers are labeled separately. Public searches use generic topics extracted from your question.' : 'Answers use the product and task records currently visible in this workspace.'}</p><div className="ask-rail-count"><span><Layers3 size={17}/> Products</span><strong>{products.length.toString().padStart(2, '0')}</strong></div><div className="ask-rail-count"><span><CheckCircle2 size={17}/> Open actions</span><strong>{tasks.filter(item => item.status !== 'done').length.toString().padStart(2, '0')}</strong></div></div><div className="ask-rail-card"><span>KEEP BUILDING</span><button onClick={onAddProduct}><Plus size={16}/> Add a product <ArrowUpRight size={15}/></button><button onClick={onAddTask}><Plus size={16}/> Create a task <ArrowUpRight size={15}/></button></div><div className="ask-rail-note"><Bot size={18}/><p>{!demo && geminiEnabled ? 'Cope uses reviewed evidence first and web research when needed. Web results require review before product decisions or admission to your evidence library.' : 'Cope searches your workspace records. Source-grounded pilot AI is not connected in this environment yet.'}</p></div></aside></div>
  </div>;
}
